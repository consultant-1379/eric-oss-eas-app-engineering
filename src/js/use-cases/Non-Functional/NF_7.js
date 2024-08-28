import http from 'k6/http';
import { check, group } from 'k6';
import { errorCounter } from './easTests.js';
import { NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_Params, cmHandlecount, nodeModelIdRadio, SUBSYSTEM_MANAGER_URL } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { describe } from './describe.js';
import { removeTrailingSlash } from '../../utility/utility.js';

var subsystemId;
var filterParams = 'filters={"name":"enm-8281:eric-oss-restsim-release-for-app-eng:80"}';
var selectParams = 'name,id';

export function NF_7() {
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
  describe('NF_TC_007: Register Single RadioNode type CmHandle', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_007                   |');
    console.log(' --------------------------------------------------');
    const datanew = {
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      createdCmHandles: cmHandle.cmHandleBody,
    };
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF7_1 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(datanew), cm_Params);
    elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    let new_data = JSON.stringify(datanew);
    console.log('datanew' + new_data);
    console.log('Status of queryResult: ' + NF7_1.status);
    console.log('Body of queryResult: ' + NF7_1.body);
    if (!NF7_1) {
      console.log(NF7_1.body);
    }
    const res1 = check(NF7_1, {
      [' Ramp up the number of ' + cmHandlecount + 'cmHandles queried over the duration of 3 minute ']: (r) => NF7_1.status === 200,
      ['Elapsed time for register ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => 1 === 1,
    });
    if (!res1) {
      errorCounter.add(1);
    }
    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_007                  |');
    console.log(' --------------------------------------------------');
  });
}
