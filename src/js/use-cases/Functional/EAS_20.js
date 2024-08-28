import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { OUTSIDE_API_GW_TLS_URL } from '../../utility/constants.js';
import { startFrame, endLine, deleteSubsystem, registerENM } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { discoveredSubsystemDeletedCheck, getCmHandlesForEnm } from '../../utility/utility.js';

const API_GW_SUBSYSTEM = `${OUTSIDE_API_GW_TLS_URL}subsystem-manager/`;
let connectivityCheckRequestId;
let head;

export default function (arg, headSef) {
  head = arg;
  let subsystemId;
  startFrame('Connectivity check');
  describe('EAS_TC_020: Post connectivity check request', function () {
    subsystemId = registerENM('EAS_20');
    const name = subsystemId[1];
    console.log('name: ' + name);
    const connectivityCheckRequestBody = JSON.stringify({
      name: name,
      type: 'DomainManager',
      healthCheckTime: '1h',
      url: `http://eric-oss-restsim-release-for-app-eng`,
      operationalState: 'REACHABLE',
      adapterLink: 'eric-eo-enm-adapter',
      connectionProperties: [
        {
          name: 'connection1',
          username: `administrator`,
          password: `TestPassw0rd`,
        },
      ],
      vendor: 'Ericsson',
    });
    myCheck(http.post(`${API_GW_SUBSYSTEM}v1/check-connectivity?subsystemId=${subsystemId[0]}`, ``, head), 'v1');
    myCheck(http.post(`${API_GW_SUBSYSTEM}v1/check-connectivity`, connectivityCheckRequestBody, head), 'v1');
    myCheck(http.post(`${API_GW_SUBSYSTEM}v2/check-connectivity`, connectivityCheckRequestBody, head), 'v2');
    myCheck(http.post(`${API_GW_SUBSYSTEM}v2/check-connectivity?subsystemId=${subsystemId[0]}`, ``, head), 'v2');
  });

  describe('Delete subsystem for connectivity check', function () {
    deleteSubsystem(subsystemId[0]);
    sleep(2);
    discoveredSubsystemDeletedCheck(subsystemId[0]);
    getCmHandlesForEnm(subsystemId[0], 0, headSef);
  });
  endLine('Finished Connectivity check');
}

function myCheck(response, vType) {
  let res = check(response, {
    [`Connectivity check request created successfully on ${vType} (201 CREATED)`]: () => response.status === 201,
  });
  if (!res) {
    console.log(`Connectivity check request FAILED on ${vType} endpoint`);
    console.log('Response status: ' + response.status);
    errorCounter.add(1);
  }

  console.log('Response body: ' + response.body);
  const connectivityCheckBody = response.body.replace(/\\"/g, '"');

  connectivityCheckRequestId = JSON.parse(connectivityCheckBody).requestId;
  console.log('connectivityCheckBody: ' + connectivityCheckBody);
  console.log('retrieve ID from connectivityCheckRequestId: ' + connectivityCheckRequestId);

  console.log('Get result:');
  let requestStatus = '',
    retries = 0;
  let getConnectivityCheckResult, getConnectivityCheckResultBody;
  while (retries != 5 && requestStatus !== 'Completed') {
    let url = `${API_GW_SUBSYSTEM}${vType}/check-connectivity/${connectivityCheckRequestId}`;
    console.log('url ::: ' + url);
    getConnectivityCheckResult = http.get(url, '', head);
    getConnectivityCheckResultBody = JSON.parse(getConnectivityCheckResult.body);
    requestStatus = getConnectivityCheckResultBody[0].requestStatus;
    console.log('retries>> ' + retries++);
    sleep(4);
  }
  console.log('Response body: ' + getConnectivityCheckResult.body);
  res = check(getConnectivityCheckResult, {
    [`Connectivity check result got successfully on ${vType} endpoint (200 OK)`]: () => getConnectivityCheckResult.status === 200,
    [`Connectivity check requestStatus is "Completed" on ${vType} endpoint`]: () => getConnectivityCheckResultBody[0].requestStatus === 'Completed',
    [`Connectivity check successfulResult is true on ${vType} endpoint`]: () => getConnectivityCheckResultBody[0].successfulResult,
  });
  if (!res) {
    console.log(`Connectivity check result FAILED on ${vType} endpoint`);
    console.log('Response status: ' + getConnectivityCheckResult.status);
    errorCounter.add(1);
  }
}
