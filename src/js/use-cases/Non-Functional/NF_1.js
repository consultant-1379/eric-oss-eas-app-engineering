import http from 'k6/http';
import { check, group } from 'k6';
import { errorCounter } from './easTests.js';
import { NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_Params, cmHandlecount, nodeModelIdRadio } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { describe } from './describe.js';
import { removeTrailingSlash } from '../../utility/utility.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_';
const targetNode = 'ManagedElement=RadioNode-K6_';

export default function (subsystemId) {
  let cmHandle = generateCmHandleList(targetDnPrefix, targetNode, cmHandlecount, subsystemId, nodeModelIdRadio);
  describe('NF_TC_001: Register Single RadioNode type CmHandle', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_001                    |');
    console.log(' --------------------------------------------------');
    const datanew = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      createdCmHandles: cmHandle.cmHandleBody,
    };
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF1_1 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(datanew), cm_Params);
    elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    if (!NF1_1) {
      console.log(NF1_1.body);
    }
    const res1 = check(NF1_1, {
      ['Register ' + cmHandlecount + ' new RadioNode status is 200']: (r) => NF1_1.status === 200,
      ['Elapsed time for register ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => NF1_1.status === 200,
    });
    if (!res1) {
      errorCounter.add(1);
      NF1_1.body && console.log('nf1_1 body: ' + NF1_1.body);
      console.log(NF1_1.status);
    }

    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_001                  |');
    console.log(' --------------------------------------------------');
  });
}
