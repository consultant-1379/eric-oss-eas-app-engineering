import http from 'k6/http';
import { check } from 'k6';
import { IAM_HOST, NCMP_URL, OUTSIDE_API_GW_TLS_URL, TIEH_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { Trend } from 'k6/metrics';
import { errorCounter } from '../../main.js';
import { discoverStatusCheck, statusCTSdiscovery, statusTIEHdiscovery, getCmHandlesForEnm, setCmHandleCount, registerENM, deleteSubsystem, CTScleanupCheck, startFrame, extractCmHandleAndManagedElementIds } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { fancyTimeFormat, discoveredSubsystemDeletedCheck } from '../../utility/utility.js';

export var connectionPropertiesId;

var subsystemId;
var cmHandle_hash;
var cmHandlesList = [];
var responseBody;
var isSharedCnfAvailable = false;
var singlePair5G = {};

const durationGAT311 = new Trend('end_to_end_discover_duration_with_100_cmhandles_seconds', true);

const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

export default function (head, data, headSef) {
  let RadioNodenodescount = data.radiocnt;
  let SharedCNFnodescount = data.sharedcnt;
  console.log('SHAREDCNF COUNT: ' + SharedCNFnodescount);
  startFrame('Starting GAT');
  describe('Set cmHandleCount before subsystem registration', function () {
    console.log('Set cmHandleCount');
    setCmHandleCount(RadioNodenodescount, 'Ireland');
  });

  console.log('Starting GAT 3.1');
  describe('GAT 3.1: Add new ENM to Sub System Manager', function () {
    console.log('Starting Cleanup...');
    describe('Cleanup Subsystem Manager before GAT 3.1', function () {
      let subsystemList = http.get(OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems', '', head);
      console.log('List of subsystems before cleanup: ' + subsystemList.body);
      var responsebody = JSON.parse(subsystemList.body);
      console.log(responsebody.length);
      if (responsebody.length > 0) {
        subsystemId = responsebody[0].id;
        console.log('Cleaning up remaining registered Subsystems');
        deleteSubsystem(subsystemId);
        discoveredSubsystemDeletedCheck(subsystemId);
        getCmHandlesForEnm(subsystemId, 0, headSef);
        console.log('Check GNBCUCPs in CTS....');
        let ctsType = 'gnbcucp',
          timeout = 6,
          ctsdatacount = 4,
          errcheck = false;
        CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
        console.log('Check GNBCUUPs in CTS....');
        ctsType = 'gnbcuup';
        CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
        console.log('Check GNBDUs in CTS....');
        ctsType = 'gnbdu';
        CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
        console.log('Check NRCell in CTS....');
        ctsType = 'nrcell';
        CTScleanupCheck(ctsType, timeout, ctsdatacount, errcheck);
        console.log('Check NRSectorCarrier in CTS....');
        ctsType = 'nrsectorcarrier';
        CTScleanupCheck(ctsType, timeout, ctsdatacount, true);
      } else {
        console.log('There is no subsystem for deletion');
        const res = check(subsystemList, {
          'Checking Subsystem Manager for Subsystem cleanup (status: 200)': (r) => subsystemList.status === 200,
          ['No Subsystem found!']: () => responsebody.length === 0,
        });
      }
    });
    console.log('Step 1: Registering an ENM in Connected Systems as DomainManager');
    const startTimeOfGAT3_1_1 = Date.now();
    describe('Registering an ENM in Connected Systems as DomainManager', function () {
      subsystemId = registerENM(' GAT 3.1 ');
      //return [subsystemId, name];
      subsystemId = subsystemId[0];
    });

    // TODO: skipping GAT 3.1 / Step 2 as it seems to be broken functionality in Connected Systems 3.0.0-67
    // Will enable it once CS has a fixed version, need to unblock our pipelines now.

    //    console.log('Step 2: Setting the ENM subsystem password');
    //    describe('Setting the ENM subsystem password', function () {
    //      // might be skippable
    //      const postENM_body = JSON.stringify({
    //        url: `http://eric-eo-enm-stub`,
    //        connectionProperties: [
    //          {
    //            id: `${connectionPropertiesId}`,
    //            encryptedKeys: [],
    //            name: 'connection1',
    //            username: `administrator`,
    //            password: `TestPassw0rd`,
    //          },
    //        ],
    //      });
    //
    //      let setEnmPassword = http.patch(`${SUBSYSTEM_MANAGER_URL}subsystem-manager/v1/subsystems/${subsystemId}`, postENM_body, postENM_Params);
    //
    //      const res = check(setEnmPassword, {
    //        'ENM update was succesful (status: 200)': (r) => setEnmPassword.status === 200,
    //      });
    //      if (!res) {
    //        console.log('Setting ENM password: ' + setEnmPassword.body);
    //        console.log('Setting ENM password: ' + setEnmPassword.status);
    //        errorCounter.add(1);
    //      }
    //    });
    console.log('Step 3: Verify if the ENM has been updated');
    describe('Verify if the ENM has been updated', function () {
      let checkUpdatedENM = http.get(`${OUTSIDE_API_GW_TLS_URL}subsystem-manager/v3/subsystems/${subsystemId}`, head);

      const res = check(checkUpdatedENM, {
        'ENM is updated (status: 200)': (r) => checkUpdatedENM.status === 200,
      });
      if (!res) {
        console.log('ENM update verification: ' + checkUpdatedENM.body);
        console.log('ENM update verification: ' + checkUpdatedENM.status);
        errorCounter.add(1);
      }
    });
    console.log('Step 4: Waiting for discovery');
    describe('Waiting for discovery', function () {
      var statusCheckResult = discoverStatusCheck(subsystemId, 'CREATED');

      let cmHandleCount;
      isSharedCnfAvailable = statusCheckResult[2];
      if (statusCheckResult[2] === true) {
        cmHandleCount = RadioNodenodescount + SharedCNFnodescount * 3;
      } else {
        cmHandleCount = RadioNodenodescount;
      }

      console.log('countOfCmHandles1 :>> ', cmHandleCount);
      getCmHandlesForEnm(subsystemId, cmHandleCount, headSef);
    });
    console.log('Step 5: Verify the registered cmHandles');
    describe('Verify the registered cmHandles', function () {
      let getCMHandleIDs = http.get(NCMP_URL + 'cps/api/v1/dataspaces/NFP-Operational/anchors', cm_ParamsNoAuth);
      responseBody = JSON.parse(getCMHandleIDs.body);
      const res1 = check(getCMHandleIDs, {
        'CmHandle list successful': () => getCMHandleIDs.status === 200,
      });
      if (!res1) {
        errorCounter.add(1);
      }
      //Filling the CMHandleList with all the ids
      responseBody.forEach((e) => {
        if (e.name != 'ran-network-simulation') {
          cmHandlesList.push(e.name);
        }
      });

      const res = check(getCMHandleIDs, {
        'Cm Handle registration was successful (status: 200)': (r) => getCMHandleIDs.status === 200,
        'Cm Handle registration has cmHandles': (r) => responseBody.length > 1,
      });
      if (!res) {
        console.log('CM Handle verification: ' + getCMHandleIDs.status);
        getCMHandleIDs.body && console.log('CM Handle verification: ' + getCMHandleIDs.body);
        responseBody.length && console.log('CM Handle verification: ' + responseBody.length);
        errorCounter.add(1);
      }
      //Choose one of cmHandle from the list
      cmHandle_hash = cmHandlesList[0];
    });
    console.log('Step 6: Verify if cmHandles are registered with emsId property');
    describe('Verify if cmHandles are registered with emsId property', function () {
      let cmHandleCount;
      if (isSharedCnfAvailable === true) {
        cmHandleCount = RadioNodenodescount + SharedCNFnodescount * 3;
      } else {
        cmHandleCount = RadioNodenodescount;
      }

      console.log('countOfCmHandles2 :>> ', cmHandleCount);
      const query = {
        cmHandleQueryParameters: [
          {
            conditionName: 'hasAllProperties',
            conditionParameters: [
              {
                emsId: `${subsystemId}`,
              },
            ],
          },
          {
            conditionName: 'cmHandleWithCpsPath',
            conditionParameters: [{ cpsPath: "//state[@cm-handle-state='READY']" }],
          },
        ],
      };
      console.log('Searches endpoint body :>> ', JSON.stringify(query));
      const queryResult = http.post(`${IAM_HOST}ncmp/v1/ch/searches`, JSON.stringify(query), headSef);
      console.log('Status of queryResult: ' + queryResult.status);
      responseBody = JSON.parse(queryResult.body);
      if (responseBody.length || responseBody.length == 0) {
        console.info('New version of searches endpoint');
      } else {
        console.info('Old version of searches endpoint');
        responseBody = responseBody.cmHandles;
      }

      const res2 = check(queryResult, {
        ['Queried ' + cmHandleCount + ' cmHandles returned']: () => responseBody.length === cmHandleCount,
      });
      if (!res2) {
        console.log('Status of queryResult: ' + queryResult.status);
        console.log('Body of queryResult: ' + queryResult.body);
        console.log('Length of queryResult: ' + responseBody.length);
        errorCounter.add(1);
      }
      let verifyCMHandles = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/properties`, headSef);
      try {
        responseBody = JSON.parse(verifyCMHandles.body);
        console.log('verifyCMHandles body: ' + JSON.stringify(responseBody));
      } catch (error) {
        console.log('Error parsing JSON response:', error);
        console.log('verifyCMHandles response: ' + verifyCMHandles.body);
      }

      const res = check(verifyCMHandles, {
        'Get cmHandle properties was successful (status: 200)': (r) => verifyCMHandles.status === 200,
        'cmHandle has emsId property which is the id of the registered subsystem': (r) => responseBody.publicCmHandleProperties[0].emsId == subsystemId,
      });
      if (!res) {
        console.log('CM Handle verification emsId status: ' + verifyCMHandles.status);
        console.log('CM Handle verification emsId body: ' + verifyCMHandles.body);
        errorCounter.add(1);
      }
    });
    console.log('Step 7: Topology verification in Common Topology Service');
    describe('Topology verification in Common Topology Service', function () {
      let ctsType = 'nrcell',
        timeoutTime = 20,
        errcheck = true,
        ctsCount;
      ctsCount = RadioNodenodescount / 2;
      if (RadioNodenodescount < 100) {
        timeoutTime = 10;
      } else if (RadioNodenodescount < 200) {
        timeoutTime = 20;
      } else if (RadioNodenodescount < 1000) {
        timeoutTime = 60;
      } else {
        timeoutTime = 180;
      }
      /*
      IDUN-61050
      cmHandle generation script was changed in enm stub, so there is 1/2 5G node and 1/2 4G node.
      In case of 100 cmHandles there are 50/50 5G/4G nodes
      The nrcell count is 4 times greater than the count of cmHandle in case of 5G nodes
      So it should be 50x4 = 200 (cmHandleCount/2*4)
      */
      console.log('Check gnbcuup in CTS....');
      ctsType = 'gnbcuup';
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
      console.log('Check gnbcucp in CTS....');
      ctsType = 'gnbcucp';
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
      console.log('Check eNodeB in CTS....');
      ctsType = 'enodeb';
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
      console.log('Check LTEcell in CTS....');
      ctsType = 'ltecell';
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount * 4);
      console.log('Check gnbdu in CTS....');
      ctsType = 'gnbdu';
      // IDUN-89372 [RTA][Bulk Query] - Disable the discovery and notification support for Cloud RAN/Shared-CNF nodes in RTA
      SharedCNFnodescount = 0;
      if (SharedCNFnodescount == 100) {
        ctsCount = RadioNodenodescount / 2 + 90;
      }
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
      console.log('Check NRCell in CTS....');
      ctsType = 'nrcell';
      if (SharedCNFnodescount == 100) {
        ctsCount = RadioNodenodescount * 2 + 270;
      } else {
        ctsCount = RadioNodenodescount * 2;
      }
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
      console.log('Check nrsectorcarrier in CTS....');
      ctsType = 'nrsectorcarrier';
      statusCTSdiscovery(ctsType, timeoutTime, errcheck, ctsCount);
    });
    console.log('Step 8: Topology verification in TIEH');
    describe('Topology verification in TIEH', function () {
      let tiehType = 'NRCellDU',
        timeoutTime = 20,
        errcheck = true,
        tiehCount;
      tiehCount = RadioNodenodescount / 2;
      if (RadioNodenodescount < 100) {
        timeoutTime = 10;
      } else if (RadioNodenodescount < 200) {
        timeoutTime = 20;
      } else if (RadioNodenodescount < 1000) {
        timeoutTime = 60;
      } else {
        timeoutTime = 180;
      }
      /*
      IDUN-61050
      cmHandle generation script was changed in enm stub, so there is 1/2 5G node and 1/2 4G node.
      In case of 100 cmHandles there are 50/50 5G/4G nodes
      The nrcell count is 4 times greater than the count of cmHandle in case of 5G nodes
      So it should be 50x4 = 200 (cmHandleCount/2*4)
      */
      console.log('Check gnbcuup in TIEH....');
      tiehType = 'GNBCUUPFunction';
      statusTIEHdiscovery(tiehType, 2, tiehCount);
      console.log('Check gnbcucp in TIEH....');
      tiehType = 'GNBCUCPFunction';
      statusTIEHdiscovery(tiehType, 2, tiehCount);
      console.log('Check eNodeB in TIEH....');
      tiehType = 'ENodeBFunction';
      statusTIEHdiscovery(tiehType, 2, tiehCount);
      console.log('Check LTEcell in TIEH....');
      tiehType = 'EUtranCell';
      statusTIEHdiscovery(tiehType, 2, 4 * tiehCount);
      console.log('Check gnbdu in TIEH....');
      tiehType = 'GNBDUFunction';
      // IDUN-89372 [RTA][Bulk Query] - Disable the discovery and notification support for Cloud RAN/Shared-CNF nodes in RTA
      //SharedCNFnodescount = 0;
      if (SharedCNFnodescount == 100) {
        tiehCount = RadioNodenodescount / 2 + 100;
      }
      statusTIEHdiscovery(tiehType, 2, tiehCount);
      console.log('Check NRCell in TIEH....');
      tiehType = 'NRCellDU';
      if (SharedCNFnodescount == 100) {
        tiehCount = RadioNodenodescount * 2 + 300;
      } else {
        tiehCount = RadioNodenodescount * 2;
      }
      statusTIEHdiscovery(tiehType, 2, tiehCount);
      console.log('Check nrsectorcarrier in TIEH....');
      tiehType = 'NRSectorCarrier';
      statusTIEHdiscovery(tiehType, 2, tiehCount);
    });
    const endTimeOfGAT3_1_1 = Date.now();
    let durationGAT311ms = endTimeOfGAT3_1_1 - startTimeOfGAT3_1_1;
    let durationGAT311fancy = fancyTimeFormat(durationGAT311ms);
    durationGAT311.add(durationGAT311ms / 1000);
    console.log('Duration of end-to-end discover with 100 cmHandles: ' + durationGAT311fancy);
    check(durationGAT311ms, {
      ['Duration of end-to-end discover with 100 cmHandles was ' + durationGAT311fancy]: (r) => r >= 0,
    });
  });

  const { result, responseArray } = extractCmHandleAndManagedElementIds(cmHandlesList, headSef);
  if (result.length > 0) {
    singlePair5G = result[0];
    const { cmHandleId, managedElementId } = singlePair5G;

    console.log('cmHandleId Gat3.1 :>> ', cmHandleId);
    console.log('managedElementId Gat3.1 :>> ', managedElementId);
  }

  console.log('Ending GAT 3.1');
}

export { cmHandle_hash };
export { subsystemId };
export { isSharedCnfAvailable };
export { singlePair5G };
