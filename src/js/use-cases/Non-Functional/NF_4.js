import http from 'k6/http';
import { check, group } from 'k6';
import { errorCounter } from './easTests.js';
import { NCMP_URL, cm_Params, cmHandlecount, nodeModelIdRadio } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { describe } from './describe.js';
const targetDnPrefix = 'MeContext=RadioNode-K6_';
const targetNode = 'ManagedElement=RadioNode-K6_';
export default function (subsystemId) {
  let cmHandle = generateCmHandleList(targetDnPrefix, targetNode, cmHandlecount, subsystemId, nodeModelIdRadio);
  const cm_handle_id = cmHandle.cmHandleIds;
  describe('NF_TC_004: Modules endpoint in NCMP', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_004                    |');
    console.log(' --------------------------------------------------');
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF4_1;
    for (let i = 1; i <= cmHandlecount; i++) {
      NF4_1 = http.get(NCMP_URL + 'ncmp/v1/ch/' + cm_handle_id[i - 1] + '/modules', {}, cm_Params);
      elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    }
    const res = check(NF4_1, {
      ['Modules endpoint in NCMP ' + cmHandlecount + ' Modules endpoint in NCMP status is 200']: (r) => NF4_1.status === 200,
      ['Elapsed time Getting module-set from NCMP ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => 1 === 1,
    });
    if (!res) {
      errorCounter.add(1);
      console.log('Status of  NF4_1: ' + NF4_1.status);
      console.log('Body of  NF4_1: ' + NF4_1.body);
    }

    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_004                  |');
    console.log(' --------------------------------------------------');
  });
}
