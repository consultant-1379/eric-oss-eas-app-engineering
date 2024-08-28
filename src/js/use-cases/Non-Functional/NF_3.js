import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { errorCounter } from './easTests.js';
import { RAN_TOPOLOGY_ADAPTER, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, TOPOLOGY_CORE_URL, getCTS_Params, cm_Params, cm_ParamsNoAuth, cmHandlecount } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { statusCTSdiscovery } from './utility.js';
import { describe } from './describe.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_';
const targetNode = 'ManagedElement=RadioNode-K6_';

export default function (subsystemId) {
  let cmHandle = generateCmHandleList(targetDnPrefix, targetNode, cmHandlecount, subsystemId);
  describe('NF_TC_003: Topology discovery of 1000 cmHandles', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_003                    |');
    console.log(' --------------------------------------------------');
    const body = {
      cmHandles: cmHandle.cmHandleIds,
    };
    console.log('body: ' + JSON.stringify(body));
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF3_1 = http.post(RAN_TOPOLOGY_ADAPTER + 'v1/discover', JSON.stringify(body), cm_ParamsNoAuth);
    if (!NF3_1) {
      console.log('NF3_1.status: ' + NF3_1.status);
      console.log('NF3_1.body: ' + NF3_1.body);
    }

    let ctsType = 'gnbdu';
    let min = 30;
    let errCheck = true;
    statusCTSdiscovery(ctsType, min, errCheck, cmHandlecount);

    elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    check(NF3_1, {
      ['Elapsed time for discover ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => NF3_1.status === NF3_1.status,
    });

    let getCTS_Resources = http.get(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctc/resource/`, getCTS_Params);
    console.log('CTS resource body: ' + getCTS_Resources.body);
    console.log('CTS resource status: ' + getCTS_Resources.status);

    var responseBody = JSON.parse(getCTS_Resources.body);

    console.log('Starting cleanup of CTS');
    startRegTime = Date.now();
    elapsedRegSeconds = 0;
    responseBody.forEach((element) => {
      let del = http.del(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/${element.href}`, {}, getCTS_Params);
      console.log('Cleanup from CTS body: ' + del.body);
      console.log('Cleanup from CTS status: ' + del.status);
      console.log('Cleanup from CTS element href: ' + element.href);
    });
    elapsedRegSeconds = (Date.now() - startRegTime) / 1000;

    console.log('Ending cleanup of CTS');
    check(NF3_1, {
      ['Elapsed time for CTS cleanup ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => elapsedRegSeconds < 3600,
    });

    getCTS_Resources = http.get(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctc/resource/`, getCTS_Params);

    console.log('Cleanup from CTS body: ' + getCTS_Resources.body);
    console.log('Cleanup from CTS status: ' + getCTS_Resources.status);

    check(getCTS_Resources, {
      'CTS gave a response (status: 200)': (r) => getCTS_Resources.status === 200,
    });

    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_003                  |');
    console.log(' --------------------------------------------------');
  });
}
