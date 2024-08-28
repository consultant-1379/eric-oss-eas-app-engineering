import { describe } from '../../utility/describe.js';
import { customMetrics, errorCounterChar } from '../../characteristicsTests.js';
import { NCMP_URL, IAM_HOST, ENM_URL, CLIENT_ROLES_CHAR, clientId, CHAR_TEST_TYPE } from '../../utility/constants.js';
import { convertCommandResponse, countNetworkElements, discoverStatusCheck, filterResponse, filterResponseForRadioNodes, getCmHandlesForEnm, sendCommand } from '../../utility/utility.js';
import * as auth from '../../utility/auth.js';
import http from 'k6/http';
import { sleep, check } from 'k6';

export var connectionPropertiesId;

export function sendCommandsThroughNCMP(session, method, url, body, scenario) {
  // let urlWithHost = `${NCMP_URL}${url}`;
  let urlWithHost = `${session.gatewayUrl}${url}`;
  let operation = '';
  if (method === 'POST') {
    operation = 'createOperation';
  } else if (method === 'GET') {
    operation = 'readOperation';
  } else if (method === 'PATCH') {
    operation = 'updateOperation';
  } else if (method === 'DELETE') {
    operation = 'deleteOperation';
  } else {
    operation = 'unknownOperation';
  }
  if (scenario !== undefined && scenario !== null) {
    operation = scenario;
  }

  let retries = 0;
  let success = false;
  while (retries <= 10 && !success) {
    let res = http.request(method, urlWithHost, body, session.sessionHeader);
    if (res.status < 200 || res.status >= 300) {
      console.log(`${operation}; ${__VU}; Duration: ${res.timings.duration}; ResponseCode: ${res.status}; ResponseBody: ${JSON.stringify(res.body)}; Request: ${urlWithHost}`);
      // console.log(`${operation}; ${__VU} - ${__ITER}; Duration: ${res.timings.duration}; ResponseCode: ${res.status}; ResponseBody: ${JSON.stringify(res.body)}; Request: ${urlWithHost}`);
      customMetrics[operation + 'Failed'].add(res.timings.duration);
      errorCounterChar.add(1);
      let failAnyway = false;
      let resBody, dmiResponseBody;
      if (res.body !== null) {
        resBody = JSON.parse(res.body);
      } else {
        failAnyway = true;
      }
      if (!failAnyway && resBody['dmi-response'] !== undefined) {
        if (resBody['dmi-response']['http-code'] === 404) {
          failAnyway = true;
        } else {
          dmiResponseBody = JSON.parse(resBody['dmi-response']['body']);
        }
      } else {
        failAnyway = true;
      }
      if (!failAnyway && res.status === 502 && dmiResponseBody['corrective-action']['retry-after'] !== undefined) {
        retries++;
        let retryAfter = dmiResponseBody['corrective-action']['retry-after'];
        if (retryAfter > 60) {
          retryAfter = 60;
        }
        console.log(`Retrying request in ${retryAfter} seconds - ${retries} - ${operation}; ${__VU}`);
        // console.log(`Retrying request in ${retryAfter} seconds - ${retries} - ${operation}; ${__VU} - ${__ITER}`);
        sleep(retryAfter);
      } else {
        success = true;
        console.log(`Request failed with non-retryable error - ${operation}; ${__VU}`);
        // console.log(`Request failed with non-retryable error - ${operation}; ${__VU} - ${__ITER}`);
      }
    } else {
      if (__ITER % 100 == 0) {
        console.log(`${operation} ${__VU} - ${__ITER} Duration: ${res.timings.duration} ResponseCode: ${res.status}`);
      }
      // console.log(`${operation}; ${__VU} - ${__ITER}; Duration: ${res.timings.duration}; ResponseCode: ${res.status};`);
      customMetrics[operation + 'Successful'].add(res.timings.duration);
      success = true;
      const r = check(res, {
        'Operation success rate: ': (r) => res.status <= 204,
      });
    }
  }
}

export function registerSubsystem(name, url, session) {
  let subsystemId;
  describe('Registering an ENM in Connected Systems as DomainManager', function () {
    const postENM_body = JSON.stringify({
      subsystemType: {
        type: 'DomainManager',
      },
      name: `${name}`,
      healthCheckTime: '1h',
      url: `${url}`,
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
    let registerEnm = http.post(`${session.gatewayUrl}subsystem-manager/v1/subsystems`, postENM_body, session.sessionHeader);
    if (registerEnm.status > 204) {
      console.log('');
      console.log('Request:');
      console.log(url);
      console.log('Response:');
      console.log(registerEnm.status);
      console.log(JSON.stringify(registerEnm));
    }

    subsystemId = JSON.parse(registerEnm.body).id;
    try {
      connectionPropertiesId = JSON.parse(registerEnm.body).connectionProperties[0].id;
    } catch (error) {
      console.log('Error while getting connectionPropertiesId, error message :>> ' + error);
    }
    const res = check(registerEnm, {
      'ENM registration was successful (status: 201)': (r) => registerEnm.status === 201,
    });
    console.log('Body of registered ENM: ' + registerEnm.body);
    console.log('ID of registered ENM: ' + subsystemId);
    if (!res) {
      console.log('ENM subsystem creation: ' + registerEnm.body);
      console.log('ENM subsystem creation: ' + registerEnm.status);
      console.log('ENM subsystem creation: ' + subsystemId);
    }
  });

  describe('Waiting for discovery', function () {
    discoverStatusCheck(subsystemId, 'CREATED');
  });
  return subsystemId;
}

export function getSubsystemId(subsystemUrl, session) {
  let subsystemId = 0;
  describe('Find registered ENM from Subsystem Manager', function () {
    let url = subsystemUrl.replace(/^https?\:\/\//i, '');
    let subsystemList = http.get(`${session.gatewayUrl}subsystem-manager/v3/subsystems`, session.sessionHeader);
    console.log('List of subsystems: ' + subsystemList.body);
    let responseBody = JSON.parse(subsystemList.body);
    if (responseBody.length > 0) {
      for (let i = 0; i < responseBody.length; i++) {
        console.log('RESPONSE URL: ' + responseBody[i].url);
        if (responseBody[i].url.includes(url)) {
          subsystemId = responseBody[i].id;
          console.log('Found registered Subsystem: ID :>> ' + subsystemId + '  Name :>> ' + responseBody[i].name);
        }
      }
    } else {
      console.log('Could not find subsystem with url: ' + url);
    }
  });
  return subsystemId;
}

export function deregisterSubsystem(subsystemUrl, session) {
  describe('Cleanup registered ENM from Subsystem Manager', function () {
    let subsystemId = getSubsystemId(subsystemUrl, session);
    if (subsystemId !== 0) {
      let delSubsystem = http.del(`${session.gatewayUrl}subsystem-manager/v1/subsystems/${subsystemId}`, {}, session.sessionHeader);
      if (delSubsystem.status !== 204) {
        console.log('Could not delete subsystem with ID: ' + subsystemId);
        fail();
      }
      console.log('Deleted subsystem with ID: ' + subsystemId);
      getCmHandlesForEnm(subsystemId, 0, session.sessionHeader);
    } else {
      console.log('There is no subsystem for deletion');
    }
  });
}

export function authorizeAPIGW(url, userHeaders) {
  const jar = http.cookieJar();
  jar.set(url);
  let login_path = 'auth/v1/login';
  let authFlag = true,
    retries = 1,
    request;
  const URL = url.concat(login_path);
  console.log('URL: ' + URL);
  while (authFlag && retries <= 5) {
    request = http.request('POST', URL, '', userHeaders);
    console.log('Authorization Status: ' + request.status);
    console.log('Request Body: ' + request.body);
    if (request.status < 200 || request.status >= 300) {
      console.log('Error retrying request');
      retries++;
      sleep(10);
    } else {
      authFlag = false;
    }
  }
  if (authFlag === true) {
    console.log('Authorization Failed');
  } else {
    console.log('Authorization Successful');
  }
  return request.body;
}

export function authorizeSEF() {
  const jar = http.cookieJar();
  jar.set(IAM_HOST);
  let keycloakToken = auth.getKeycloakToken().json()['access_token'];
  console.log('Keycloak Token: ' + keycloakToken);
  let tokenDuration = auth.setKeycloakTokenDuration(keycloakToken);
  console.log('Token Duration: ' + JSON.stringify(tokenDuration));
  let client = auth.createClient(keycloakToken, clientId);
  console.log('Create client: ' + JSON.stringify(client));
  let getClientId = auth.getClientIdList(keycloakToken, clientId);
  console.log('getClientId: ' + JSON.stringify(getClientId));
  let bodyGetClientId = JSON.parse(getClientId.body);
  let k6ClientId = bodyGetClientId[0].id;
  console.log('k6ClientId: ' + k6ClientId);

  let serviceRolesId = auth.getServiceRolesId(keycloakToken, k6ClientId).json()['id'];
  console.log('serviceRolesId: ' + serviceRolesId);
  let getServiceRolesIdList = auth.getServiceRolesIdList(keycloakToken, serviceRolesId);
  let serviceRolesIdList = JSON.parse(getServiceRolesIdList.body);
  console.log('serviceRolesIdList: ' + getServiceRolesIdList.body);
  if (200 <= client.status && client.status < 300) {
    const rolesWithIds = CLIENT_ROLES_CHAR.map((role) => {
      const id = serviceRolesIdList.find((roleId) => roleId.name === role).id;
      const name = role;
      return {
        id,
        name,
      };
    });

    let setServiceRole = auth.setServiceRoles(keycloakToken, serviceRolesId, rolesWithIds);
  }
  let secret = auth.regenerateClientSecret(keycloakToken, k6ClientId).json()['value'];
  console.log('SECRET: ' + secret);
  let getAccessToken = auth.getKeycloakTokenSecret(clientId, secret);
  let access_token = getAccessToken.json()['access_token'];
  console.log('Access token: ' + access_token);
  return { access_token, k6ClientId };
}

export function getNodeCountsFromENMNew(sessionENM) {
  let radioNodes, counts, addCounts, filtered5gNodes, filtered4gNodes, radioNodesAll, NEwithStatus, NRCellDUCount, NRSectorCarrierCount, EUtranCellFDDCount, EUtranCellTDDCount;

  console.log('Getting RadioNodes...');
  radioNodesAll = convertCommandResponse(sendCommand('cmedit get * ManagedElement.neType==RadioNode', sessionENM, ENM_URL), 'FDN : ');
  console.log('Getting NetworkElements...');
  NEwithStatus = sendCommand('cmedit get * NetworkElement.neType==RadioNode NetworkElement.(softwareSyncStatus,radioAccessTechnology,networkFunctions)', sessionENM, ENM_URL);
  radioNodes = filterResponse(radioNodesAll, NEwithStatus);
  //80k and xs restsim include the same nodes as the test ENMs do so node filtering is the same
  filtered5gNodes = filterResponseForRadioNodes(radioNodes, CHAR_TEST_TYPE.includes('restsim') ? 'NR' : 'NR');
  filtered4gNodes = filterResponseForRadioNodes(radioNodes, CHAR_TEST_TYPE.includes('restsim') ? 'LTE' : 'LTE');
  // 30k and 50k restsims include different type of nodes so filtering has to happen differently
  // filtered5gNodes = filterResponseForRadioNodes(radioNodes, CHAR_TEST_TYPE.includes('restsim') ? 'sim' : 'NR');
  // filtered4gNodes = filterResponseForRadioNodes(radioNodes, CHAR_TEST_TYPE.includes('restsim') ? 'sim' : 'LTE');
  console.log('Getting NRCellDUs...');
  NRCellDUCount = convertCommandResponse(sendCommand('cmedit get * NRCellDU', sessionENM, ENM_URL), 'FDN : ').length;
  console.log('Getting NRSectorCarriers...');
  NRSectorCarrierCount = convertCommandResponse(sendCommand('cmedit get * NRSectorCarrier', sessionENM, ENM_URL), 'FDN : ').length;
  console.log('Getting EUtranCellFDDs...');
  EUtranCellFDDCount = convertCommandResponse(sendCommand('cmedit get * EUtranCellFDD', sessionENM, ENM_URL), 'FDN : ').length;
  console.log('Getting EUtranCellTDDs...');
  EUtranCellTDDCount = convertCommandResponse(sendCommand('cmedit get * EUtranCellTDD', sessionENM, ENM_URL), 'FDN : ').length;
  console.log('radioNodesCount :>> ', radioNodes.length);
  counts = countNetworkElements(NEwithStatus);
  addCounts = { nrcell: NRCellDUCount, nrsectorcarrier: NRSectorCarrierCount, ltecell: EUtranCellFDDCount + EUtranCellTDDCount, cmHandlecounts: radioNodes.length };
  for (const key in addCounts) {
    if (addCounts.hasOwnProperty(key)) {
      counts[key] = addCounts[key];
    }
  }
  console.log('counts :>> ', counts);
  return {
    nodes5g: filtered5gNodes,
    nodes4g: filtered4gNodes,
    counts: counts,
  };
}

export function timeTaken(startTime) {
  let elapsedMilliseconds,
    elapsedMinutes = 0;
  elapsedMilliseconds = Date.now() - startTime;
  elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);
  return elapsedMinutes;
}
