import http from 'k6/http';
import { check } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_MODEL_ADAPTER_URL, cm_ParamsNoAuth, nodeModelIdSharedCNF } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { allModules } from './EAS_15.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=SharedCNF-K6_0001';
const targetNode1 = '';

export default function (subsystemId) {
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode1);
  startFrame('Starting EAS_TC_016: Get all module-resources for Shared-CNF type CmHandle');
  describe('EAS_TC_016: Get all module-resources for Shared-CNF type CmHandle', function () {
    const data = {
      data: {
        modules: allModules,
      },
      cmHandleProperties: {
        subSystem: `${subsystemId}`,
        targetDnPrefix: `${targetDnPrefix}`,
        targetNode: `${targetNode1}`,
        nodeModelIdentity: `${nodeModelIdSharedCNF}`,
        ossModelIdentity: `${nodeModelIdSharedCNF}`,
        softwareSyncStatus: 'AS_IS',
        neType: 'Shared-CNF',
        excludedModels: 'ManagedElement',
      },
    };

    let TC16_2 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/moduleResources', JSON.stringify(data), cm_ParamsNoAuth);

    console.log('Check #1: Get all module-resources for Shared-CNF type CmHandle status is 200');
    console.log('Check #1: Body includes requested module resources');
    console.log('Check #1: All module resources returned');
    const res = check(TC16_2, {
      'Get all module-resources for Shared-CNF type CmHandle status is 200': (r) => TC16_2.status === 200,
      'Body includes requested module resources': (r) => TC16_2.body.includes('ericsson-sync', 'ericsson-truststore-ext'),
      'All module resources returned': () => JSON.parse(TC16_2.body).length === allModules.length,
    });
    if (!res) {
      const length = JSON.parse(TC16_2.body).length;
      console.log(`Status of EAS_TC_016 is ${TC16_2.status}`);
      console.log(`Body EAS_TC_016 is ${TC16_2.body}`);
      console.log(`Count of modules in response ${length}`);
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_016');
}
