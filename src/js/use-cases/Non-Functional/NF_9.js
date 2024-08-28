import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { RAN_TOPOLOGY_ADAPTER, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, TOPOLOGY_CORE_URL, getCTS_Params, cm_Params, cm_ParamsNoAuth, cmHandlecount, SUBSYSTEM_MANAGER_URL, nodeModelIdRadio } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { statusCTSdiscovery, removeTrailingSlash } from './utility.js';
import { errorCounter } from './easTests.js';
import { describe } from './describe.js';

var subsystemId;
var filterParams = 'filters={"name":"enm-8281:eric-oss-restsim-release-for-app-eng:80"}';
var selectParams = 'name,id';

export function NF_9() {
  var anysize = 5; //the size of string
  var charset = 'abcdefghijklmnopqrstuvwxyz'; //from where to create
  var result = '';
  for (var i = 0; i < anysize; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
    //console.log(result)
  }
  const targetDnPrefix = 'MeContext=RadioNode-K6_' + result + '_';
  const targetNode = 'ManagedElement=RadioNode-K6_' + result + '_';
  console.log(targetDnPrefix);
  console.log(targetNode);
  let subsystemListResponse = http.get(SUBSYSTEM_MANAGER_URL + 'subsystem-manager/v3/subsystems' + '?' + encodeURIComponent(filterParams) + '&select=' + selectParams);
  console.log('subsystemListResponse: ' + subsystemListResponse.body);
  var subsystemListJsonObject = JSON.parse(subsystemListResponse.body);
  subsystemId = subsystemListJsonObject[0].id; // Using first element, as there must be only one hit. Name is unique.
  console.log('subsystemId for simulated ENM: ' + subsystemId);
  let cmHandle = generateCmHandleList(targetDnPrefix, targetNode, cmHandlecount, subsystemId, nodeModelIdRadio);
  const cm_handle_id = cmHandle.cmHandleIds;
  console.log('subsystemId for cmHandle: ' + cm_handle_id);

  describe('NF_TC_009: Topology discovery of 1000 cmHandles', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_009                    |');
    console.log(' --------------------------------------------------');
    const datanew = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      createdCmHandles: cmHandle.cmHandleBody,
    };
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF9_2 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(datanew), cm_Params);
    elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    if (!NF9_2) {
      console.log(NF9_2.body);
    }
    const res1 = check(NF9_2, {
      ['Register ' + cmHandlecount + ' new RadioNode status is 200']: (r) => NF9_2.status === 200,
      ['Elapsed time for register ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => NF9_2.status === 200,
    });
    if (!res1) {
      errorCounter.add(1);
    }
    const body = {
      cmHandles: cmHandle.cmHandleIds,
    };
    let startRegTime1 = Date.now(),
      elapsedRegSeconds1 = 0;
    let NF9_1 = http.post(RAN_TOPOLOGY_ADAPTER + 'v1/discover', JSON.stringify(body), cm_ParamsNoAuth);
    if (!NF9_1) {
      console.log('NF9_1.status: ' + NF9_1.status);
      console.log('NF9_1.body: ' + NF9_1.body);
    }
    let ctsType = 'gnbdu';
    let min = 30;
    let errCheck = true;
    statusCTSdiscovery(ctsType, min, errCheck, cmHandlecount);
    elapsedRegSeconds1 = (Date.now() - startRegTime1) / 1000;
    check(NF9_1, {
      ['Elapsed time for discover ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds1 + ' seconds']: (r) => NF9_1.status === NF9_1.status,
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
    check(NF9_1, {
      ['Elapsed time for CTS cleanup ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => elapsedRegSeconds < 3600,
    });

    getCTS_Resources = http.get(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctc/resource/`, getCTS_Params);

    console.log('Cleanup from CTS body: ' + getCTS_Resources.body);
    console.log('Cleanup from CTS status: ' + getCTS_Resources.status);

    check(getCTS_Resources, {
      'CTS gave a response (status: 200)': (r) => getCTS_Resources.status === 200,
    });

    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_009                  |');
    console.log(' --------------------------------------------------');
  });
}
