import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { errorCounter } from '../../main.js';
import { IAM_HOST, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_ParamsNoAuth, enm_Params, nodeModelIdSharedCNF } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine, fancyTimeFormat, resetEvents, checkEvents, removeTrailingSlash } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=SharedCNF-K6_0001';
const targetNode1 = '';
const targetNode2 = 'ManagedElement=1';
const targetNode3 = 'RANInfrastructureSupport=1';

const durationEAS15 = new Trend('eas_15_shared_cnf_type_cmhandle_creation_time_seconds', true);

const K6_CONSUMER_GROUP = 'k6-eas_15-consumer-group';
const K6_CONSUMER_ID = 'k6-eas_15-cgi-1';

export var allModules;

export default function (subsystemId, headSef) {
  const cmHandle_id1 = getcmHandleid(targetDnPrefix, targetNode1);
  const cmHandle_id2 = getcmHandleid(targetDnPrefix, targetNode2);
  const cmHandle_id3 = getcmHandleid(targetDnPrefix, targetNode3);
  startFrame('Starting EAS_TC_015: Register single Shared-CNF type CmHandle, get module-set from Model Adapter and NCMP');
  describe('EAS_TC_015: Register Single Shared-CNF type CmHandle', function () {
    // Reset last events from "ncmp-events" Kafka topic
    resetEvents('ncmp-events', K6_CONSUMER_GROUP);

    const data = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      createdCmHandles: [
        {
          cmHandle: `${cmHandle_id1}`,
          cmHandleProperties: {
            subSystem: `${subsystemId}`,
            targetDnPrefix: `${targetDnPrefix}`,
            targetNode: `${targetNode1}`,
            nodeModelIdentity: `${nodeModelIdSharedCNF}`,
            ossModelIdentity: `${nodeModelIdSharedCNF}`,
            softwareSyncStatus: 'AS_IS',
            neType: 'Shared-CNF',
            excludedModels: 'ManagedElement,RANInfrastructureSupport',
          },
        },
        {
          cmHandle: `${cmHandle_id2}`,
          cmHandleProperties: {
            subSystem: `${subsystemId}`,
            targetDnPrefix: `${targetDnPrefix}`,
            targetNode: `${targetNode2}`,
            nodeModelIdentity: `${nodeModelIdSharedCNF}`,
            ossModelIdentity: `${nodeModelIdSharedCNF}`,
            softwareSyncStatus: 'AS_IS',
            neType: 'Shared-CNF',
            hostedBy: `${cmHandle_id1}`,
          },
          publicCmHandleProperties: {
            hostedBy: `${cmHandle_id1}`,
          },
        },
        {
          cmHandle: `${cmHandle_id3}`,
          cmHandleProperties: {
            subSystem: `${subsystemId}`,
            targetDnPrefix: `${targetDnPrefix}`,
            targetNode: `${targetNode3}`,
            nodeModelIdentity: `${nodeModelIdSharedCNF}`,
            ossModelIdentity: `${nodeModelIdSharedCNF}`,
            softwareSyncStatus: 'AS_IS',
            neType: 'Shared-CNF',
            hostedBy: `${cmHandle_id1}`,
          },
          publicCmHandleProperties: {
            hostedBy: `${cmHandle_id1}`,
          },
        },
      ],
    };

    let cmHandleCreateFlag = true,
      retries = 1,
      TC15_2;
    let startTimeOfEAS15, endTimeOfEAS15;
    while (cmHandleCreateFlag && retries <= 10) {
      TC15_2 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(data), cm_ParamsNoAuth);
      if (TC15_2.status < 200 || TC15_2.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC15_2.body);
        retries++;
        sleep(20);
      } else {
        cmHandleCreateFlag = false;
        startTimeOfEAS15 = Date.now();
      }
    }

    console.log('Check #1: Register new Shared-CNF status is 200');
    const res1 = check(TC15_2, {
      'Register new Shared-CNF status is 200': (r) => TC15_2.status === 200,
    });
    if (!res1) {
      console.log(`Status of EAS_TC_015 is ${TC15_2.status}`);
      console.log(`Body EAS_TC_015 is ${TC15_2.body}`);
      errorCounter.add(1);
    }

    const data2 = {
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode1}`,
        nodeModelIdentity: `${nodeModelIdSharedCNF}`,
        ossModelIdentity: `${nodeModelIdSharedCNF}`,
        softwareSyncStatus: 'AS_IS',
        neType: 'Shared-CNF',
        excludedModels: 'ManagedElement,RANInfrastructureSupport',
      },
    };
    let enmmaFlag = true,
      TC15_3;
    retries = 1;
    while (enmmaFlag && retries <= 15) {
      TC15_3 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id1}` + '/modules', JSON.stringify(data2), enm_Params);
      if (TC15_3.status < 200 || TC15_3.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC15_3.body);
        retries++;
        sleep(20);
      } else {
        enmmaFlag = false;
      }
    }
    allModules = JSON.parse(TC15_3.body).schemas.map((m) => ({ name: m.moduleName, revision: m.revision }));

    console.log('Check #2: Get module-set from EO ENM Adapter for the given CmHandle -> Status is 200');
    console.log('Check #2: Body is not Empty');
    const res2 = check(TC15_3, {
      'Get module-set from EO ENM Adapter for the given CmHandle -> Status is 200': (r) => TC15_3.status === 200,
      'Body is not Empty': (r) => TC15_3.body != [],
    });
    if (!res2) {
      console.log(`Status for EAS_TC_015_3 is ${TC15_3.status}`);
      console.log(`Body for EAS_TC_015_3 is ${TC15_3.body}`);
      console.log(`Count of modules in response ${JSON.parse(TC15_3.body).length}`);
      errorCounter.add(1);
    }

    let ncmpModuleFlag = true,
      TC15_4;
    retries = 1;
    while (ncmpModuleFlag && retries <= 15) {
      TC15_4 = http.get(IAM_HOST + `ncmp/v1/ch/` + `${cmHandle_id1}` + `/modules`, headSef);
      if (TC15_4.status < 200 || TC15_4.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC15_4.body);
        retries++;
        sleep(20);
      } else {
        ncmpModuleFlag = false;
      }
    }
    console.log('Check #3: Using the generated CmHandle, query NCMP for EO ENM in TC_15-> status is 200');
    console.log('Check #3: Body is Not empty');
    const res3 = check(TC15_4, {
      'Using the generated CmHandle, query NCMP for EO ENM in TC_15-> status is 200': (r) => TC15_4.status === 200,
      'Body is Not empty ': (r) => TC15_4.body != [],
    });
    if (!res3) {
      console.log(`Status of EAS_TC_015_4 is ${TC15_4.status}`);
      console.log(`Body of EAS_TC_015_4 is ${TC15_4.body}`);
      errorCounter.add(1);
    }

    console.log('Check for special attribute');

    let startTime = Date.now();
    let elapsedMilliseconds = 0;
    let polling = true;
    let timeout = 300000; //5 mins

    while (polling) {
      elapsedMilliseconds = Date.now() - startTime;
      console.log('elapsedMilliseconds: ' + elapsedMilliseconds);
      let statusCheck = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandle_id1}/state`, headSef);

      if (statusCheck.body.includes('READY') || elapsedMilliseconds >= timeout) {
        elapsedMilliseconds < timeout ? console.log('CMHandle state changed') : console.log('Timeout');
        polling = false;
      } else {
        console.log('Waiting for CMHandle to get to READY state...');
        sleep(10);
      }
    }

    // check new events on "ncmp-events" Kafka topic
    let isSharedCNF = true;
    checkEvents('ncmp-events', K6_CONSUMER_GROUP, cmHandle_id1, isSharedCNF);

    // if RTA will support Shared-CNF topology discover we will turn on this part.
    // let datastore = 'passthrough-running';
    // let nrcellduid = 'NRCellDUNR45gNodeBRadio0006-1';
    // const managedelementid = 'NR48gNodeBRadio0009';
    // let ncmpFlag = true,
    //   TC15_5;
    // retries = 1;
    // while (ncmpFlag && retries <= 15) {
    //   TC15_5 = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandle_id}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrcellduid}&options=(fields=attributes(pLMNIdList))`, headSef);
    //   if (TC15_5.status < 200 || TC15_5.status >= 300) {
    //     console.log('Error retrying request');
    //     console.log('Request Body: ' + TC15_5.body);
    //     retries++;
    //     sleep(20);
    //   } else {
    //     ncmpFlag = false;
    //   }
    // } //
    // console.log('Check #4: Get special attribute for cmHandle status is 200');
    // console.log('Check #4: Body includes requested pLMNIdList attribute');
    // const res4 = check(TC15_5, {
    //   'Get special attribute for cmHandle status is 200': () => TC15_5.status === 200,
    //   'Body includes requested pLMNIdList attribute': () => TC15_5.body.includes('pLMNIdList'),
    // });

    // if (!res4) {
    //   console.log('Status of TC15_5: ' + TC15_5.status);
    //   console.log('Body of TC15_5: ' + TC15_5.body);
    //   errorCounter.add(1);
    // }
    // let ctsType = 'gnbdu',
    //   ctstimeout = 30,
    //   errCounter = false,
    //   debug = 1;
    // console.log('Check ' + cmHandle_id + ' in gnbdu.');
    // verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    // ctsType = 'gnbcuup';
    // console.log('Check ' + cmHandle_id + ' in gncuup.');
    // verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    // ctsType = 'gnbcucp';
    // console.log('Check ' + cmHandle_id + ' in gncucp.');
    // verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    // ctsType = 'nrcell';
    // console.log('Check ' + cmHandle_id + ' in nrcell.');
    // verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    // ctsType = 'nrsectorcarrier';
    // console.log('Check ' + cmHandle_id + ' in nrcell.');
    // verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    // endTimeOfEAS15 = Date.now();
    // let durationEAS15ms = endTimeOfEAS15 - startTimeOfEAS15;
    // let durationEAS15fancy = fancyTimeFormat(durationEAS15ms);
    // durationEAS15.add(durationEAS15ms / 1000);
    // console.log('Radionode type cmhandle creation time: ' + durationEAS15fancy);
    // check(durationEAS15ms, {
    //   ['Radionode type cmhandle creation time was ' + durationEAS15fancy]: (r) => r >= 0,
    // });

    const cmhandle_body = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      removedCmHandles: [`${cmHandle_id1}`, `${cmHandle_id2}`, `${cmHandle_id3}`],
    };

    console.log('Cleanup cmHandles');
    console.log('cmhandle_body: ' + JSON.stringify(cmhandle_body));
    let cleanupcmHandles = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(cmhandle_body), cm_ParamsNoAuth);

    console.log('Check #5: Cleanup cmHandles status is 200');
    const res5 = check(cleanupcmHandles, {
      'Cleanup cmHandles status is 200': (r) => cleanupcmHandles.status === 200,
    });
    if (!res5) {
      console.log('Status of cleanupcmHandles: ' + cleanupcmHandles.status);
      console.log('Body of cleanupcmHandles: ' + cleanupcmHandles.body);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_015');
}
