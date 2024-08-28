import http from 'k6/http';
import { check } from 'k6';
import { errorCounter } from '../../main.js';
import { IAM_HOST, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_ParamsNoAuth, enm_Params, nodeModelIdvDU } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine, removeTrailingSlash } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=cloudNode_001-vdu';
const targetNode = 'ManagedElement=cloudNode_001-vdu';

export default function (subsystemId, headSef) {
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode);

  startFrame('Starting EAS_TC_005: Register single vDU type CmHandle, get module-set from Model Adapter and NCMP');
  describe('EAS_TC_005: Register Single vDU type CmHandle', function () {
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
            nodeModelIdentity: `${nodeModelIdvDU}`,
            ossModelIdentity: `${nodeModelIdvDU}`,
            softwareSyncStatus: 'AS_IS',
            neType: 'vDU',
          },
        },
      ],
    };

    let TC5_2 = http.post(IAM_HOST + 'ncmpInventory/v1/ch', JSON.stringify(data), headSef);

    console.log('Check #1: Register new vDU status is 200');
    const res1 = check(TC5_2, {
      'Register new vDU status is 200': (r) => TC5_2.status === 200,
    });
    if (!res1) {
      console.log(`Status of EAS_TC_005 is ${TC5_2.status}`);
      console.log(`Body EAS_TC_005 is ${TC5_2.body}`);
      errorCounter.add(1);
    }

    const data2 = {
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode}`,
        nodeModelIdentity: `${nodeModelIdvDU}`,
        ossModelIdentity: `${nodeModelIdvDU}`,
        softwareSyncStatus: 'AS_IS',
        neType: 'vDU',
      },
    };

    let TC5_3 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/modules', JSON.stringify(data2), enm_Params);

    console.log('Check #2: Get module-set from Model Adapter for the given CmHandle -> Status is 200');
    console.log('Check #2: Body is not Empty');
    const res2 = check(TC5_3, {
      'Get module-set from Model Adapter for the given CmHandle -> Status is 200': (r) => TC5_3.status === 200,
      'Body is not Empty': (r) => TC5_3.body != [],
    });
    if (!res2) {
      console.log(`Status for EAS_TC_005_3 is ${TC5_3.status}`);
      console.log(`Body for EAS_TC_005_3 is ${TC5_3.body}`);
      errorCounter.add(1);
    }

    let TC5_4 = http.get(IAM_HOST + `ncmp/v1/ch/` + `${cmHandle_id}` + `/modules`, headSef);

    console.log('Check #3: Using the generated CmHandle, query NCMP for models -> status is 200');
    console.log('Check #3: Body is Not empty');
    const res3 = check(TC5_4, {
      'Using the generated CmHandle, query NCMP for models -> status is 200': (r) => TC5_4.status === 200,
      'Body is Not empty ': (r) => TC5_4.body != [],
    });
    if (!res3) {
      console.log(`Status of EAS_TC_005_4 is ${TC5_4.status}`);
      console.log(`Body of EAS_TC_005_4 is ${TC5_4.body}`);
      errorCounter.add(1);
    }

    const cmhandle_body = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      removedCmHandles: [`${cmHandle_id}`],
    };

    console.log('Cleanup cmHandles');
    console.log('cmhandle_body: ' + JSON.stringify(cmhandle_body));

    let cleanupcmHandles = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(cmhandle_body), cm_ParamsNoAuth);

    console.log('Check #4: Cleanup cmHandles status is 200');
    const res4 = check(cleanupcmHandles, {
      'Cleanup cmHandles status is 200': (r) => cleanupcmHandles.status === 200,
    });
    if (!res4) {
      console.log('Status of cleanupcmHandles: ' + cleanupcmHandles.status);
      console.log('Body of cleanupcmHandles: ' + cleanupcmHandles.body);
      errorCounter.add(1);
    }
  });
  endLine('Enging EAS_TC_005');
}
