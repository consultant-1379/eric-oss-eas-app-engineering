import http from 'k6/http';
import { check, group } from 'k6';
import { errorCounter } from './easTests.js';
import { NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, cm_Params, nodeModelIdRadio, cmHandlecount, SUBSYSTEM_MANAGER_URL } from './constants.js';
import { generateCmHandleList } from './hash.js';
import { describe } from './describe.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_';
const targetNode = 'ManagedElement=RadioNode-K6_';

var subsystemId;
var filterParams = 'filters={"name":"enm-8281:eric-oss-restsim-release-for-app-eng:80"}';
var selectParams = 'name,id';

export function NF_8() {
  let subsystemListResponse = http.get(SUBSYSTEM_MANAGER_URL + 'subsystem-manager/v3/subsystems' + '?' + encodeURIComponent(filterParams) + '&select=' + selectParams);

  var subsystemListJsonObject = JSON.parse(subsystemListResponse.body);
  subsystemId = subsystemListJsonObject[0].id; // Using first element, as there must be only one hit. Name is unique.
  console.log('subsystemId for simulated ENM: ' + subsystemId);

  let cmHandle = generateCmHandleList(targetDnPrefix, targetNode, cmHandlecount, subsystemId, nodeModelIdRadio);
  const cm_handle_id = cmHandle.cmHandleIds;
  describe('NF_TC_008: Retrieving modules and moduleResources for 1000 cmHandles', function () {
    console.log(' --------------------------------------------------');
    console.log('|               Start NF_TC_008                   |');
    console.log(' --------------------------------------------------');
    let startRegTime = Date.now(),
      elapsedRegSeconds = 0;
    let NF8_1;
    var count = 0;
    for (let i = 1; i <= cmHandlecount; i++) {
      let number = String(i).padStart(4, '0');
      let targetDnPrefixnew = targetDnPrefix + number;
      let targetNodenew = targetNode + number;
      const datanew = {
        cmHandleProperties: {
          subSystem: `${subsystemId}`,
          targetDnPrefix: `${targetDnPrefixnew}`,
          targetNode: `${targetNodenew}`,
          nodeModelIdentity: `${nodeModelIdRadio}`,
          ossModelIdentity: `${nodeModelIdRadio}`,
          softwareSyncStatus: 'AS_IS',
          neType: 'RadioNode',
        },
        publicCmHandleProperties: {
          emsid: `${subsystemId}`,
        },
      };
      NF8_1 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + cm_handle_id[i - 1] + '/modules', JSON.stringify(datanew), cm_Params);
      elapsedRegSeconds = (Date.now() - startRegTime) / 1000;
    }
    const res = check(NF8_1, {
      [' Ramp up the number of ' + cmHandlecount + 'cmHandles queried over the duration of 5 minute ']: (r) => NF8_1.status === 200,
      ['Elapsed time Getting module-set from Model Adapter ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds + ' seconds']: (r) => 1 === 1,
    });
    if (!res) {
      errorCounter.add(1);
      console.log(NF8_1.body);
    }
    let startRegTime_2 = Date.now(),
      elapsedRegSeconds_2 = 0;
    let NF8_2;
    for (let i = 1; i <= cmHandlecount; i++) {
      let number = String(i).padStart(4, '0');
      let targetDnPrefixnew = targetDnPrefix + number;
      let targetNodenew = targetNode + number;
      const data = {
        data: {
          modules: [
            {
              name: 'ericsson-enm-RtnPBRIPv4',
              revision: '7785-08-16',
            },
            {
              name: 'ericsson-enm-RcsTimeM',
              revision: '5768-11-11',
            },
          ],
        },
        cmHandleProperties: {
          subSystem: `${subsystemId}`,
          targetDnPrefix: `${targetDnPrefixnew}`,
          targetNode: `${targetNodenew}`,
          nodeModelIdentity: `${nodeModelIdRadio}`,
          neType: 'RadioNode',
        },
      };
      NF8_2 = http.post(ENM_MODEL_ADAPTER_URL + 'dmi/v1/ch/' + cm_handle_id[i - 1] + '/moduleResources', JSON.stringify(data), cm_Params);
      elapsedRegSeconds_2 = (Date.now() - startRegTime_2) / 1000;
      let new_data = JSON.stringify(data);
      console.log('datanew' + new_data);
      console.log('Status of queryResult: ' + NF8_2.status);
      console.log('Body of queryResult: ' + NF8_2.body);
    }
    const res1 = check(NF8_2, {
      [' NF8_2 Ramp up the number of ' + cmHandlecount + 'cmHandles queried over the duration of 5 minute ']: (r) => NF8_2.status === 200,
      ['NF8_2 Elapsed time Getting module-set from Model Adapter new ' + cmHandlecount + ' cmHandles is ' + elapsedRegSeconds_2 + ' seconds']: (r) => 1 === 1,
    });
    if (!res1) {
      errorCounter.add(1);
      console.log(NF8_2.body);
    }
    console.log(' --------------------------------------------------');
    console.log('|                End of NF_TC_008                 |');
    console.log(' --------------------------------------------------');
  });
}
