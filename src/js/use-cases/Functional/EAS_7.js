import http from 'k6/http';
import { check } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_MODEL_ADAPTER_URL, cm_ParamsNoAuth, nodeModelIdRadio } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { allModules } from '../../use-cases/Functional/EAS_6.js';
import { describe } from '../../utility/describe.js';
import { startFrame, endLine } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_0001';
const targetNode = 'ManagedElement=RadioNode-K6_0001';

export default function (subsystemId) {
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode);
  startFrame("Starting EAS_TC_007: Get all module-resources for RadioNode type CmHandle");
  describe('EAS_TC_007: Get all module-resources for RadioNode type CmHandle', function () {
    const data = {
      data: {
        modules: allModules,
      },
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

    let TC7_2 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + `${cmHandle_id}` + '/moduleResources', JSON.stringify(data), cm_ParamsNoAuth);

    console.log("Check #1: Get all module-resources for RadioNode type CmHandle status is 200");
    console.log("Check #1: Body includes requested module resources");
    console.log("Check #1: All module resources returned");
    const res = check(TC7_2, {
      'Get all module-resources for RadioNode type CmHandle status is 200': (r) => TC7_2.status === 200,
      'Body includes requested module resources': (r) => TC7_2.body.includes('ericsson-enm-RtnPBRIPv4', 'ericsson-enm-RcsTimeM'),
      'All module resources returned': () => JSON.parse(TC7_2.body).length === allModules.length,
    });
    if (!res) {
      console.log(`Status of EAS_TC_007 is ${TC7_2.status}`);
      console.log(`Body EAS_TC_007 is ${TC7_2.body}`);
      console.log(`Count of modules in response ${JSON.parse(TC7_2.body).length}`);
      errorCounter.add(1);
    }
  });
  endLine("Finished EAS_TC_007");
}
