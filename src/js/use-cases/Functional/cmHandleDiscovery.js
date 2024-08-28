import { check, sleep } from 'k6';
import http from 'k6/http';
import { errorCounter, authorize, RadioNodenodescount, SharedCNFnodescount } from '../../main.js';
import { OUTSIDE_API_GW_TLS_URL, enm_Params } from '../../utility/constants.js';
import { discoverStatusCheck, statusCTSdiscovery, getCmHandlesForEnm, startFrame, endLine } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';

export var enmStubId;

const DISCOVERY_TIMEOUT = 420000; // 7 minutes in msec

const enm_body = JSON.stringify({
  subsystemTypeId: '1',
  name: 'ENM_stub_k6',
  url: 'http://eric-eo-enm-stub',
  connectionProperties: [
    {
      name: 'connection1',
      username: 'administrator',
      password: 'TestPassw0rd',
    },
  ],
  vendor: 'Ericsson',
  adapterLink: 'eric-eo-enm-adapter',
  subsystemType: {
    id: '1',
    type: 'DomainManager',
    category: 'Primary',
  },
});

export default function () {
  startFrame('Starting EAS_TC_003: Register ENM stub to connected systems');
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  describe('EAS_TC_003: CM Discovery Flow', function () {
    console.log('Registering ENM Stub for CM Discovery....');
    // Register ENM stub
    let registerEnmResponse = http.post(OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v1/subsystems', enm_body, head);
    enmStubId = JSON.parse(registerEnmResponse.body).id;
    console.log('Check #1: Discovery Flow started (status 201)');
    console.log('Check #2: Verify Register ENM stub details');
    const res1 = check(registerEnmResponse, {
      'Discovery Flow started (status 201)': (r) => registerEnmResponse.status === 201,
      'Verify Register ENM stub details': (r) => registerEnmResponse.body.includes('ENM_stub_k6'),
    });
    if (!res1) {
      console.log('Registered ENM stub id: ' + enmStubId);
      errorCounter.add(1);
    }
    // Verify ENM stub is registered
    console.log('Check #3: Verify ENM stub is registered');
    let updatedSubsystemList = http.get(OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems', '', head);
    const res2 = check(updatedSubsystemList, {
      'Verify ENM stub is registered': (r) => updatedSubsystemList.body.includes('ENM_stub_k6'),
    });
    if (!res2) {
      errorCounter.add(1);
    }

    var statusCheckResult = discoverStatusCheck(enmStubId, 'CREATED');
    let cmHandleCount;
    if (statusCheckResult[2] === true) {
      cmHandleCount = RadioNodenodescount + SharedCNFnodescount;
    } else {
      cmHandleCount = RadioNodenodescount;
    }
    console.log('countOfCmHandles :>> ', cmHandleCount);
    if (statusCheckResult[0] == true) {
      getCmHandlesForEnm(enmStubId, cmHandleCount);
    } else {
      console.log('Discovery failed for subsystem: ' + enmStubId);
    }

    console.log('Check GNBCUCPs in CTS....');
    let ctsType = 'gnbcucp',
      min = 5;
    statusCTSdiscovery(ctsType, min, true, RadioNodenodescount, 0);
    console.log('Check GNBCUUPs in CTS....');
    ctsType = 'gnbcuup';
    statusCTSdiscovery(ctsType, min, true, RadioNodenodescount, 0);
    console.log('Check GNBDUs in CTS....');
    ctsType = 'gnbdu';
    statusCTSdiscovery(ctsType, min, true, RadioNodenodescount, 0);
    console.log('Check NRCell in CTS....');
    ctsType = 'nrcell';
    statusCTSdiscovery(ctsType, min, true, RadioNodenodescount * 2, 0);
    sleep(180);
    statusCTSdiscovery(ctsType, min, true, RadioNodenodescount * 2, 0);
  });
  endLine('Ending EAS_TC_003');
}
