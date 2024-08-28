import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, NCMP_URL, OUTSIDE_API_GW_URL, OUTSIDE_API_GW_TLS_URL, IAM_HOST, k6_user, k6_password, cm_ParamsNoAuth, nodeModelIdRadio, CLIENT_ROLES, clientId } from '../../utility/constants.js';
import { getcmHandleid } from '../../utility/hash.js';
import { deleteSubsystem, getCmHandlesForEnm, CTScleanupCheck, verifycmHandleinCTS, verifycmHandleinTIEH, startFrame, endLine, TIEHcleanupCheck, removeTrailingSlash } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { isSharedCnfAvailable } from '../GAT/Gat_3_1.js';
import * as auth from '../../utility/auth.js';

const targetDnPrefix = 'MeContext=RadioNode-K6_0013';
const targetNode = 'ManagedElement=RadioNode-K6_0013';
var URI = OUTSIDE_API_GW_TLS_URL;

export default function (subsystemId, data, headSef) {
  let RadioNodenodescount = data.radiocnt;
  let SharedCNFnodescount = data.sharedcnt;
  const cmHandle_id = getcmHandleid(targetDnPrefix, targetNode);
  let k6ClientId, access_token;
  const searchRequestBody = {
    cmHandleQueryParameters: [
      {
        conditionName: 'hasAllProperties',
        conditionParameters: [
          {
            emsId: `${subsystemId}`,
          },
        ],
      },
    ],
  };
  startFrame('Starting EAS_TC_013: Verify that NCMP and RTA route is present in API GW and SEF');
  describe('EAS_TC_013: Verify that NCMP and RTA route is present in API GW and SEF', function () {
    describe('Verify NCMP through API GW', function () {
      const cmHandleRegistrationRequest = {
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
            publicCmHandleProperties: {
              emsId: `${subsystemId}`,
            },
          },
        ],
      };
      console.log('cmHandleRegistrationRequest: ' + JSON.stringify(cmHandleRegistrationRequest));
      console.log('cm_ParamsNoAuth :>> ', cm_ParamsNoAuth);
      let TC13_1 = http.post(NCMP_URL + 'ncmpInventory/v1/ch', JSON.stringify(cmHandleRegistrationRequest), cm_ParamsNoAuth);
      console.log(' status of TC_13_1 is:' + TC13_1.status);
      console.log(' body of TC_13_1 is:' + TC13_1.body);
      const res1 = check(TC13_1, {
        'Register new RadioNode -> Status is 200': (r) => TC13_1.status === 200,
      });
      if (!res1) {
        errorCounter.add(1);
      }
      console.log('Waiting for cmHandle discovery');

      // since cmHandleCleanup got removed from cmHandleDiscovery.js, the cmHandlecount got increased from 1 to 101
      let cmHandleCount;
      if (isSharedCnfAvailable === true) {
        cmHandleCount = +RadioNodenodescount + SharedCNFnodescount * 3 + 1;
      } else {
        cmHandleCount = +RadioNodenodescount + 1;
      }

      console.log('countOfCmHandles :>> ', cmHandleCount);
      getCmHandlesForEnm(subsystemId, cmHandleCount, headSef);
      const head2 = {
        headers: {
          'X-Login': `${k6_user}`,
          'X-password': `${k6_password}`,
          'X-tenant': 'master',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };
      let TC13_2 = http.post(URI + 'auth/v1/login', {}, head2);
      console.log(`status TC13_2 is ${TC13_2.status}`);
      console.log(`Body TC13_2 is ${TC13_2.body}`);
      if (TC13_2.status != 200) {
        URI = OUTSIDE_API_GW_URL;
        TC13_2 = http.post(URI + 'auth/v1/login', {}, head2);
        console.log(`Body TC13_2_2 is ${TC13_2.body}`);
      }
      const res2 = check(TC13_2, {
        'Change login session to gas status -> Status is 200': (r) => TC13_2.status === 200,
        'Body is Not empty ': (r) => TC13_2.body != [],
      });
      if (!res2) {
        console.log('TC13_2 body: ' + TC13_2.body);
        errorCounter.add(1);
      }
      let sessionId = TC13_2.body;
      console.log('| ------------------- |');
      console.log('| --Start FN_TC_013-- |');
      console.log('| ------------------- |');
      const head3 = {
        headers: {
          'content-type': `application/json`,
          Cookie: `JSESSIONID=${sessionId}`,
        },
      };
      console.log('NCMP through api-gw check');
      let TC13_3 = http.post(URI + 'ncmp/v1/ch/searches', JSON.stringify(searchRequestBody), head3);
      let counter = 0;
      let responseBody = JSON.parse(TC13_3.body);
      if (responseBody.length || responseBody.length == 0) {
        console.info('New version of searches endpoint');
        responseBody.forEach((e) => {
          if (e.cmHandle.includes(cmHandle_id)) {
            counter += 1;
          }
          // console.log('e: ' + JSON.stringify(e));
        });
      } else {
        console.info('Old version of searches endpoint');
        responseBody = responseBody.cmHandles;
        responseBody.forEach((e) => {
          if (e.cmHandleId.includes(cmHandle_id)) {
            counter += 5;
          }
          // console.log('e: ' + JSON.stringify(e));
        });
      }
      console.info('Counter: ' + counter);
      const res3 = check(counter, {
        'The cmHandleID is in the body': (r) => counter > 0,
      });
      if (!res3) {
        errorCounter.add(1);
      }
      const res4 = check(TC13_3, {
        'Post status is 200': (r) => TC13_3.status === 200,
      });
      if (!res4) {
        console.log('TC13_3 api-gw body: ' + TC13_3.body);
        errorCounter.add(1);
      }
    });
    describe('Verify NCMP through SEF', function () {
      console.log('NCMP through SEF check');
      let response = http.post(IAM_HOST + 'ncmp/v1/ch/searches', JSON.stringify(searchRequestBody), headSef);
      console.log('Body of NCMP request through SEF: ' + response.body);
      console.log('Status of NCMP request through SEF: ' + response.status);

      let counterSef = 0;
      let responseBodySef = JSON.parse(response.body);
      if (responseBodySef.length || responseBodySef.length == 0) {
        console.info('New version of searches endpoint');
        responseBodySef.forEach((e) => {
          if (e.cmHandle.includes(cmHandle_id)) {
            counterSef += 1;
          }
          // console.log('e: ' + JSON.stringify(e));
        });
      } else {
        console.info('Old version of searches endpoint');
        responseBodySef = responseBodySef.cmHandles;
        responseBodySef.forEach((e) => {
          if (e.cmHandleId.includes(cmHandle_id)) {
            counterSef += 5;
          }
          // console.log('e: ' + JSON.stringify(e));
        });
      }
      console.info('Counter SEF: ' + counterSef);
      const res5 = check(counterSef, {
        'The cmHandleID is in the body (SEF)': (r) => counterSef > 0,
      });
      if (!res5) {
        errorCounter.add(1);
      }
      const res6 = check(response, {
        'Post status is 200 (SEF)': (r) => response.status === 200,
      });
      if (!res6) {
        console.log('TC13_3 SEF body: ' + response.body);
        errorCounter.add(1);
      }
    });
    describe('Verify RAN through SEF', function () {
      console.log('Check RAN through SEF');
      let cmHandleToRediscover = {
        cmHandles: [cmHandle_id],
      };
      let responseSuccess = http.post(IAM_HOST + 'eric-oss-ran-topology-adapter/v1/discover', JSON.stringify(cmHandleToRediscover), headSef);
      const successCheck = check(
        responseSuccess,
        {
          'Post status is 202 (SEF)': (r) => responseSuccess.status === 202,
          'Body contains expected result (triggered)': (r) => responseSuccess.body.includes('Triggered'),
        },
        { legacy: false }
      );
      if (!successCheck) {
        console.log('Check positive tc body (RAN SEF): ' + responseSuccess.body);
        console.log('Check positive tc status (RAN SEF): ' + responseSuccess.status);
        errorCounter.add(1);
      }
      let responseFailed = http.post(IAM_HOST + 'eric-oss-ran-topology-adapter/v1/discover', null, null);

      const failCheck = check(
        responseFailed,
        {
          'Post status is not 202 (SEF)': (r) => responseFailed.status != 202,
        },
        { legacy: false }
      );
      if (!failCheck) {
        console.log('Check negative tc body (RAN SEF): ' + responseFailed.body);
        console.log('Check negative tc status (RAN SEF): ' + responseFailed.status);
        errorCounter.add(1);
      }
    });

    let ctsType = 'gnbdu',
      timeout = 5,
      errCounter = false,
      debug = 1;
    console.log('Check ' + cmHandle_id + ' in gnbdu.');
    verifycmHandleinCTS(ctsType, timeout, errCounter, cmHandle_id, debug);
    ctsType = 'gnbcuup';
    console.log('Check ' + cmHandle_id + ' in gncuup.');
    verifycmHandleinCTS(ctsType, timeout, errCounter, cmHandle_id, debug);
    ctsType = 'gnbcucp';
    console.log('Check ' + cmHandle_id + ' in gncucp.');
    verifycmHandleinCTS(ctsType, timeout, errCounter, cmHandle_id, debug);
    ctsType = 'nrcell';
    console.log('Check ' + cmHandle_id + ' in nrcell.');
    verifycmHandleinCTS(ctsType, timeout, errCounter, cmHandle_id, debug);

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

    sleep(60);
    console.log('| -----------------------|');
    console.log('| --Finished FN_TC_013-- |');
    console.log('| -----------------------|');
  });
  endLine('Finished EAS_TC_013');

  console.log('Starting cleanup...');
  describe('cmHandle Cleanup', function () {
    describe('Delete Subsystem', function () {
      deleteSubsystem(subsystemId);
      getCmHandlesForEnm(subsystemId, 0, headSef);
      console.log('Check GNBCUCPs in CTS....');
      let ctsType = 'gnbcucp',
        timeout = 6,
        ctsdatacount = 4,
        errcheck = false;
      if (RadioNodenodescount < 100) {
        timeout = 8;
      } else if (RadioNodenodescount < 200) {
        timeout = 15;
      } else if (RadioNodenodescount < 1000) {
        timeout = 45;
      } else {
        timeout = 120;
      }
      CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
      console.log('Check GNBCUUPs in CTS....');
      ctsType = 'gnbcuup';
      CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
      console.log('Check GNBDUs in CTS....');
      ctsType = 'gnbdu';
      CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
      console.log('Check NRCell in CTS....');
      ctsType = 'nrcell';
      timeout = 2;
      CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
      console.log('Check NRSectorCarrier in CTS....');
      ctsType = 'nrsectorcarrier';
      CTScleanupCheck(ctsType, timeout, ctsdatacount, true);

      console.log('Check gnbcuup in TIEH....');
      let tiehType = 'GNBCUUPFunction';
      TIEHcleanupCheck(tiehType, 3);
      console.log('Check gnbcucp in TIEH....');
      tiehType = 'GNBCUCPFunction';
      TIEHcleanupCheck(tiehType, 1);
      console.log('Check eNodeB in TIEH....');
      tiehType = 'ENodeBFunction';
      TIEHcleanupCheck(tiehType, 1);
      console.log('Check LTEcell in TIEH....');
      tiehType = 'EUtranCell';
      TIEHcleanupCheck(tiehType, 3);
      console.log('Check gnbdu in TIEH....');
      tiehType = 'GNBDUFunction';
      TIEHcleanupCheck(tiehType, 1);
    });
  });
}
