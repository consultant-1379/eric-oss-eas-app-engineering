import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { errorCounter } from '../../main.js';
import { IAM_HOST, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_ParamsNoAuth, enm_Params, nodeModelIdRadio } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { describe } from '../../utility/describe.js';
import { verifycmHandleinCTS, startFrame, endLine, fancyTimeFormat, resetEvents, checkEvents, verifycmHandleinTIEH, removeTrailingSlash } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_0001';
const targetNode = 'ManagedElement=RadioNode-K6_0001';

const durationEAS6 = new Trend('eas_6_radionode_type_cmhandle_creation_time_seconds', true);

const K6_CONSUMER_GROUP = 'k6-eas_6-consumer-group';
const K6_CONSUMER_ID = 'k6-eas_6-cgi-1';

export var allModules;

export default function (subsystemId, headSef) {
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode);
  startFrame('Starting EAS_TC_006: Register single RadioNode type CmHandle, get module-set from Model Adapter and NCMP');
  describe('EAS_TC_006: Register Single RadioNode type CmHandle', function () {
    // Reset last events from "ncmp-events" Kafka topic
    resetEvents('ncmp-events', K6_CONSUMER_GROUP);

    const data = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      createdCmHandles: [
        {
          cmHandle: `${cmHandle_id}`,
          cmHandleProperties: {
            subSystem: `${subsystemId}`,
            targetDnPrefix: `${targetDnPrefix}`,
            targetNode: `${targetNode}`,
            nodeModelIdentity: `${nodeModelIdRadio}`,
            ossModelIdentity: `${nodeModelIdRadio}`,
            softwareSyncStatus: 'AS_IS',
            neType: 'RadioNode',
          },
        },
      ],
    };

    let cmHandleCreateFlag = true,
      retries = 1,
      TC6_2;
    let startTimeOfEAS6, endTimeOfEAS6;
    while (cmHandleCreateFlag && retries <= 10) {
      TC6_2 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(data), cm_ParamsNoAuth);
      if (TC6_2.status < 200 || TC6_2.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC6_2.body);
        retries++;
        sleep(20);
      } else {
        cmHandleCreateFlag = false;
        startTimeOfEAS6 = Date.now();
      }
    }

    console.log('Check #1: Register new RadioNode status is 200');
    const res1 = check(TC6_2, {
      'Register new RadioNode status is 200': (r) => TC6_2.status === 200,
    });
    if (!res1) {
      console.log(`Status of EAS_TC_006 is ${TC6_2.status}`);
      console.log(`Body EAS_TC_006 is ${TC6_2.body}`);
      errorCounter.add(1);
    }

    const data2 = {
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode}`,
        nodeModelIdentity: `${nodeModelIdRadio}`,
        ossModelIdentity: `${nodeModelIdRadio}`,
        softwareSyncStatus: 'AS_IS',
        neType: 'RadioNode',
      },
    };
    let enmmaFlag = true,
      TC6_3;
    retries = 1;
    while (enmmaFlag && retries <= 15) {
      TC6_3 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/modules', JSON.stringify(data2), enm_Params);
      if (TC6_3.status < 200 || TC6_3.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC6_3.body);
        retries++;
        sleep(20);
      } else {
        enmmaFlag = false;
      }
    }
    allModules = JSON.parse(TC6_3.body).schemas.map((m) => ({ name: m.moduleName, revision: m.revision }));

    console.log('Check #2: Get module-set from EO ENM Adapter for the given CmHandle -> Status is 200');
    console.log('Check #2: Body is not Empty');
    const res2 = check(TC6_3, {
      'Get module-set from EO ENM Adapter for the given CmHandle -> Status is 200': (r) => TC6_3.status === 200,
      'Body is not Empty': (r) => TC6_3.body != [],
    });
    if (!res2) {
      console.log(`Status for EAS_TC_006_3 is ${TC6_3.status}`);
      console.log(`Body for EAS_TC_006_3 is ${TC6_3.body}`);
      console.log(`Count of modules in response ${JSON.parse(TC6_3.body).length}`);
      errorCounter.add(1);
    }

    let ncmpModuleFlag = true,
      TC6_4;
    retries = 1;
    while (ncmpModuleFlag && retries <= 15) {
      TC6_4 = http.get(IAM_HOST + `ncmp/v1/ch/` + `${cmHandle_id}` + `/modules`, headSef);
      if (TC6_4.status < 200 || TC6_4.status >= 300) {
        console.log('Error: retrying request');
        console.log('Request Body: ' + TC6_4.body);
        retries++;
        sleep(20);
      } else {
        ncmpModuleFlag = false;
      }
    }
    console.log('Check #3: Using the generated CmHandle, query NCMP for EO ENM in TC_6-> status is 200');
    console.log('Check #3: Body is Not empty');
    const res3 = check(TC6_4, {
      'Using the generated CmHandle, query NCMP for EO ENM in TC_6-> status is 200': (r) => TC6_4.status === 200,
      'Body is Not empty ': (r) => TC6_4.body != [],
    });
    if (!res3) {
      console.log(`Status of EAS_TC_006_4 is ${TC6_4.status}`);
      console.log(`Body of EAS_TC_006_4 is ${TC6_4.body}`);
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
      let statusCheck = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandle_id}/state`, headSef);

      if (statusCheck.body.includes('READY') || elapsedMilliseconds >= timeout) {
        elapsedMilliseconds < timeout ? console.log('CMHandle state changed') : console.log('Timeout');
        polling = false;
      } else {
        console.log('Waiting for CMHandle to get to READY state...');
        sleep(10);
      }
    }

    // check new events on "ncmp-events" Kafka topic
    let isSharedCNF = false;
    checkEvents('ncmp-events', K6_CONSUMER_GROUP, cmHandle_id, isSharedCNF);

    let datastore = 'passthrough-running';
    let nrcellduid = 'NRCellDUNR45gNodeBRadio0006-1';
    const managedelementid = 'RadioNode-K6_0001';
    let ncmpFlag = true,
      TC6_5;
    retries = 1;
    while (ncmpFlag && retries <= 15) {
      TC6_5 = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandle_id}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrcellduid}`)}&options=${encodeURIComponent(`(fields=attributes(pLMNIdList))`)}`, headSef);
      if (TC6_5.status < 200 || TC6_5.status >= 300) {
        console.log('Error retrying request');
        console.log('Request Body: ' + TC6_5.body);
        retries++;
        sleep(20);
      } else {
        ncmpFlag = false;
      }
    } //
    console.log('Check #4: Get special attribute for cmHandle status is 200');
    console.log('Check #4: Body includes requested pLMNIdList attribute');
    const res4 = check(TC6_5, {
      'Get special attribute for cmHandle status is 200': () => TC6_5.status === 200,
      'Body includes requested pLMNIdList attribute': () => TC6_5.body.includes('pLMNIdList'),
    });
    if (!res4) {
      console.log('Status of TC6_5: ' + TC6_5.status);
      console.log('Body of TC6_5: ' + TC6_5.body);
      errorCounter.add(1);
    }
    let ctsType = 'gnbdu',
      ctstimeout = 30,
      errCounter = false,
      debug = 1;
    console.log('Check ' + cmHandle_id + ' in gnbdu.');
    verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    ctsType = 'gnbcuup';
    console.log('Check ' + cmHandle_id + ' in gncuup.');
    verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    ctsType = 'gnbcucp';
    console.log('Check ' + cmHandle_id + ' in gncucp.');
    verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    ctsType = 'nrcell';
    console.log('Check ' + cmHandle_id + ' in nrcell.');
    verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);
    ctsType = 'nrsectorcarrier';
    console.log('Check ' + cmHandle_id + ' in nrsectorcarrier.');
    verifycmHandleinCTS(ctsType, ctstimeout, errCounter, cmHandle_id, debug);

    let tiehType = 'GNBDUFunction';
    console.log('Check ' + cmHandle_id + ' in GNBDUFunction.');
    verifycmHandleinTIEH(tiehType, 2, cmHandle_id);
    tiehType = 'GNBCUUPFunction';
    console.log('Check ' + cmHandle_id + ' in GNBCUUPFunction.');
    verifycmHandleinTIEH(tiehType, 2, cmHandle_id);
    tiehType = 'GNBCUCPFunction';
    console.log('Check ' + cmHandle_id + ' in GNBCUCPFunction.');
    verifycmHandleinTIEH(tiehType, 2, cmHandle_id);
    tiehType = 'NRCellDU';
    console.log('Check ' + cmHandle_id + ' in NRCellDU.');
    verifycmHandleinTIEH(tiehType, 2, cmHandle_id);
    tiehType = 'NRSectorCarrier';
    console.log('Check ' + cmHandle_id + ' in NRSectorCarrier.');
    verifycmHandleinTIEH(tiehType, 2, cmHandle_id);
    endTimeOfEAS6 = Date.now();
    let durationEAS6ms = endTimeOfEAS6 - startTimeOfEAS6;
    let durationEAS6fancy = fancyTimeFormat(durationEAS6ms);
    durationEAS6.add(durationEAS6ms / 1000);
    console.log('Radionode type cmhandle creation time: ' + durationEAS6fancy);
    check(durationEAS6ms, {
      ['Radionode type cmhandle creation time was ' + durationEAS6fancy]: (r) => r >= 0,
    });

    const cmhandle_body = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      removedCmHandles: [`${cmHandle_id}`],
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
  endLine('Finished EAS_TC_006');
}
