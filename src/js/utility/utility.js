import { FormData } from 'https://jslib.k6.io/formdata/0.0.2/index.js';
import http from 'k6/http';
import crypto from 'k6/crypto';
import { sleep, check } from 'k6';
import { errorCounter, authorize } from '../main.js';
import { errorCounterChar } from '../characteristicsTests.js';
import { customMetrics } from '../characteristicsTests.js';
import { cert_key, ENM_DISCOVERY_ADAPTER_URL, IAM_HOST, NCMP_URL, ENM_ADAPTER_URL, ENM_MODEL_ADAPTER_URL, CERTM_URL, ENM_URL, OUTSIDE_API_GW_TLS_URL, TIEH_URL, TOPOLOGY_CORE_URL, ENM_STUB_URL, enm_username, enm_password, cm_ParamsNoAuth, getCTS_Params } from './constants.js';
import { describe } from './describe.js';
import * as kafka from './kafka.js';

export function getAndAddCert() {
  console.log(cert_key);
  let response = http.get(CERTM_URL + 'certm/nbi/v2/trusted-certificates/enm-http-client');
  let certificates = JSON.parse(response.body).certificates;
  let numOfCert = certificates.length + 1;
  console.log(certificates.length, certificates);
  certificates.push({
    name: 'ca-certificate-' + numOfCert,
    certificate: cert_key.split('\n').join('\\n'),
  });
  console.log(certificates.length, certificates);
  //http.put(CERTM_URL + 'certm/nbi/v2/trusted-certificates/enm-http-client', JSON.stringify(certificates));
}

export function discoveredSubsystemDeletedCheck(subsystemId) {
  const DISCOVERY_POLL_TIME = 10; // 10 seconds
  //const DISCOVERY_TIMEOUT = 3000000; // 50 minutes in msec
  const DISCOVERY_TIMEOUT = 15 * 60 * 1000; // 15 min is enough
  var isDiscoveredSubsystemDeleted = false;

  let startTime = Date.now();
  let elapsedMilliseconds = 0;

  while (!isDiscoveredSubsystemDeleted && elapsedMilliseconds < DISCOVERY_TIMEOUT) {
    elapsedMilliseconds = Date.now() - startTime;
    let discoveryStatusResponse = http.get(ENM_DISCOVERY_ADAPTER_URL + 'api/v1/discovery_status/' + subsystemId);

    if (discoveryStatusResponse.status === 404) {
      console.log('Status not yet available for subsystemId: ' + subsystemId);
      isDiscoveredSubsystemDeleted = true;
    }

    sleep(DISCOVERY_POLL_TIME); // wait for discovery to finish
  }
  check(isDiscoveredSubsystemDeleted, {
    'Discovered Subsystem Deleted': (r) => isDiscoveredSubsystemDeleted === true,
    ['Elapsed time for discovery is ' + fancyTimeFormat(elapsedMilliseconds)]: (r) => elapsedMilliseconds <= DISCOVERY_TIMEOUT,
  });
  return [isDiscoveredSubsystemDeleted, elapsedMilliseconds];
}

export function discoverStatusCheck(subsystemId, stat) {
  const DISCOVERY_POLL_TIME = 7; // 7 seconds
  const DISCOVERY_TIMEOUT = 10 * 60 * 1000; // 10 min is enough
  var isDiscoveryCompleted = false;

  let startTime = Date.now();
  let elapsedMilliseconds = 0;
  let isSharedCnfAvailable = false;
  let temp, msg, msg1, msg2, msg3;
  while (!isDiscoveryCompleted && elapsedMilliseconds < DISCOVERY_TIMEOUT) {
    elapsedMilliseconds = Date.now() - startTime;
    let discoveryStatusResponse = http.get(ENM_DISCOVERY_ADAPTER_URL + 'api/v1/discovery_status/' + subsystemId);

    if (discoveryStatusResponse.status === 404) {
      temp = 'Status not yet available for subsystemId: ' + subsystemId;
      if (temp !== msg1) {
        msg1 = temp;
        console.log(temp);
      }
      sleep(0.2);
    } else {
      var discoveryStatusJson = JSON.parse(discoveryStatusResponse.body);
      temp = discoveryStatusResponse.body;
      if (temp !== msg) {
        msg = temp;
        console.log(temp);
      }

      isDiscoveryCompleted = true;
      for (var j = 0; j < discoveryStatusJson.discoveryStatus.length; j++) {
        var status = discoveryStatusJson.discoveryStatus[j].status;
        var neType = discoveryStatusJson.discoveryStatus[j].neType;

        if (neType === 'Shared-CNF') {
          isSharedCnfAvailable = true;
        }

        temp = 'status is ' + status + ' and waiting for it to be ' + stat;
        if (temp !== msg2) {
          msg2 = temp;
          console.log(temp);
        }
        if (status != stat) {
          isDiscoveryCompleted = false;
          temp = 'Discovery not yet completed for subsystemId: ' + subsystemId;
          if (temp !== msg3) {
            msg3 = temp;
            console.log(temp);
          }
        }
      }
    }
    if (discoveryStatusResponse.status !== 404) {
      if (stat != 'CREATING') {
        sleep(DISCOVERY_POLL_TIME); // wait for discovery to finish
      }
    }
  }
  check(isDiscoveryCompleted, {
    [`Discovery status is ${stat}`]: (r) => isDiscoveryCompleted === true,
    ['Elapsed time for discovery is ' + fancyTimeFormat(elapsedMilliseconds)]: (r) => elapsedMilliseconds <= DISCOVERY_TIMEOUT,
  });
  return [isDiscoveryCompleted, elapsedMilliseconds, isSharedCnfAvailable];
}

export function convertTime(time) {
  let d = new Date(1000 * Math.round(time / 1000)); // round to nearest second
  function pad(i) {
    return ('0' + i).slice(-2);
  }
  let str = d.getUTCHours() + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  return str;
}

export function cmHandleCleanup() {
  console.log('Cleaning up CM Handles');
  let counter = 1;
  let cleanCMHandles = true;
  let getCMHandleIDs;
  while (cleanCMHandles && counter < 4) {
    getCMHandleIDs = http.get(NCMP_URL + 'cps/api/v1/dataspaces/NFP-Operational/anchors', cm_ParamsNoAuth);
    console.log('getCMHandleIDs.status :>> ', getCMHandleIDs.status);
    console.log('getCMHandleIDs.body :>> ', getCMHandleIDs.body);
    console.log(counter);
    if (getCMHandleIDs.status != 200) {
      counter = counter + 1;
      sleep(10);
    } else {
      cleanCMHandles = false;
    }
  }
  var responseBody,
    cmHandlesList = [];
  if (getCMHandleIDs) {
    try {
      responseBody = JSON.parse(getCMHandleIDs.body);
    } catch (error) {
      responseBody = '';
      console.log('Error occured: ' + error);
    }
  }
  console.log('Anchor count: ' + responseBody.length);
  const res1 = check(getCMHandleIDs, {
    'CmHandle list successful': () => getCMHandleIDs.status === 200,
  });
  if (!res1) {
    //errorCounter.add(1);
    console.log('Get cmHandleIDs from NCMP: ' + getCMHandleIDs.status);
    console.log('Get cmHandleIDs from NCMP: ' + getCMHandleIDs.body);
  }
  //Filling the CM Handle List with all the ids
  responseBody.forEach((e) => {
    if (e.name != 'ran-network-simulation') {
      cmHandlesList.push(e.name);
    }
  });
  console.log('Anchor count to be deleted: ' + cmHandlesList.length);
  //Create the body structure for the cleanup request
  if (cmHandlesList.length > 0) {
    const cmHandleCleanupbody = JSON.stringify({
      dmiModelPlugin: removeTrailingSlash(ENM_MODEL_ADAPTER_URL),
      dmiDataPlugin: removeTrailingSlash(ENM_ADAPTER_URL),
      removedCmHandles: cmHandlesList,
    });
    console.log('Starting the CM Handle cleanup...');
    let startTime = Date.now(),
      elapsedMilliseconds = 0;
    let startCMCleanup = http.post(NCMP_URL + 'ncmpInventory/v1/ch', cmHandleCleanupbody, cm_ParamsNoAuth);
    elapsedMilliseconds = Date.now() - startTime;
    const res2 = check(startCMCleanup, {
      'CmHandle delete call successful': () => startCMCleanup.status === 204 || startCMCleanup.status === 200,
      ['Elapsed time for cleanup ' + cmHandlesList.length + ' cmHandles is ' + elapsedMilliseconds + ' milliseconds']: (r) => 1 === 1,
    });
    if (!res2) {
      console.log('Delete response code from NCMP: ' + startCMCleanup.status);
      console.log('Delete response body from NCMP: ' + startCMCleanup.body);
      //errorCounter.add(1);
    }
    let getCMHandles = http.get(NCMP_URL + 'cps/api/v1/dataspaces/NFP-Operational/anchors', cm_ParamsNoAuth);
    responseBody = JSON.parse(getCMHandles.body);
    console.log('CmHandle count after cleanup :' + responseBody.length);
    const res3 = check(getCMHandles, {
      'CmHandle list successful': () => getCMHandles.status === 200,
      'CmHandles removed': () => responseBody.length === 1,
    });
    if (!res3) {
      //errorCounter.add(1);
    }
  } else {
    console.log('There is no cmHandle for cleanup!');
  }
}

export function deleteSubsystem(subsystem_id) {
  console.log('Deleting Subsystem, triggering NCMP database deletion...');
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  let delSubsystem = http.del(`${OUTSIDE_API_GW_TLS_URL}subsystem-manager/v1/subsystems/${subsystem_id}`, {}, head);
  console.log('To be deleted ENM subsystem ID is : ' + subsystem_id);
  const res = check(delSubsystem, {
    'Delete ENM subsystem response status is 204 [NO CONTENT]': () => delSubsystem.status === 204,
  });
  if (!res) {
    errorCounter.add(1);
    console.log('Error while deleting ENM subsystem' + delSubsystem.body);
  }
}

export function getCmHandlesForEnm(subsystem_id, count, headSef) {
  const ID_SEARCHES_SLEEP = 10, // 10 second sleep for one cycle inside while loop
    ID_SEARCHES_TIMEOUT = 1800000; // 30 minutes for checking the cmhandle list until timeout

  const searchesBody = {
    cmHandleQueryParameters: [
      {
        conditionName: 'hasAllProperties',
        conditionParameters: [
          {
            emsId: `${subsystem_id}`,
          },
        ],
      },
      {
        conditionName: 'cmHandleWithCpsPath',
        conditionParameters: [{ cpsPath: "//state[@cm-handle-state='READY']" }],
      },
    ],
  };

  console.log('Checking NCMP database with id-searches endpoint on subsystem ' + subsystem_id);
  let postNCMPsearches = http.post(`${IAM_HOST}ncmp/v1/ch/id-searches`, JSON.stringify(searchesBody), headSef);
  let responseBody,
    startTime = Date.now(),
    elapsedMilliseconds = 0;
  try {
    responseBody = JSON.parse('' + postNCMPsearches.body);
    console.log('Number of CmHandles: ' + responseBody.length);
  } catch (error) {
    console.log('Post body: ' + postNCMPsearches.body);
    console.log('Error occured when parsing NCMP id-searches response body: ' + error);
    responseBody = postNCMPsearches.body;
  }
  let temp, msg;
  while (responseBody.length != count && elapsedMilliseconds < ID_SEARCHES_TIMEOUT) {
    postNCMPsearches = http.post(`${IAM_HOST}ncmp/v1/ch/id-searches`, JSON.stringify(searchesBody), headSef);
    try {
      responseBody = JSON.parse('' + postNCMPsearches.body);
      temp = 'Waiting for cmHandle count will be: ' + count + ' Number of CmHandles [in while loop]: ' + responseBody.length;
      if (temp !== msg) {
        msg = temp;
        console.log(temp);
      }
    } catch (error) {
      console.log('Error occured when parsing NCMP id-searches response body: ' + error);
      responseBody = postNCMPsearches.body;
    }
    elapsedMilliseconds = Date.now() - startTime;
    sleep(ID_SEARCHES_SLEEP);
  }
  console.log('Process took ' + fancyTimeFormat(elapsedMilliseconds));
  if (responseBody != null) {
    const res = check(postNCMPsearches, {
      ['NCMP ID-searches endpoint is status 200']: () => postNCMPsearches.status === 200,
      ['cmHandle count is: ' + responseBody.length]: () => responseBody.length === count,
      ['Flow finished before timeout in: ' + fancyTimeFormat(elapsedMilliseconds)]: () => elapsedMilliseconds < ID_SEARCHES_TIMEOUT,
    });
    if (!res) {
      errorCounter.add(1);
    }
  }
  return responseBody;
}

export function getCmHandlesForEnmForPS(subsystem_id, count) {
  const ID_SEARCHES_SLEEP = 10, // 10 second sleep for one cycle inside while loop
    ID_SEARCHES_TIMEOUT = 4500000; // 75 minutes for checking the cmhandle list until timeout

  const searchesBody = {
    cmHandleQueryParameters: [
      {
        conditionName: 'hasAllProperties',
        conditionParameters: [
          {
            emsId: `${subsystem_id}`,
          },
        ],
      },
      {
        conditionName: 'cmHandleWithCpsPath',
        conditionParameters: [{ cpsPath: "//state[@cm-handle-state='READY']" }],
      },
    ],
  };

  console.log('Checking NCMP database with id-searches endpoint on subsystem ' + subsystem_id);
  let postNCMPsearches = http.post(`${NCMP_URL}ncmp/v1/ch/id-searches`, JSON.stringify(searchesBody), cm_ParamsNoAuth);
  let responseBody,
    startTime = Date.now(),
    elapsedMilliseconds = 0;
  try {
    responseBody = JSON.parse('' + postNCMPsearches.body);
    console.log('Number of CmHandles: ' + responseBody.length);
  } catch (error) {
    console.log('Error occured when parsing NCMP id-searches response body: ' + error);
    responseBody = postNCMPsearches.body;
  }
  let temp, msg;
  while (responseBody.length < count && elapsedMilliseconds < ID_SEARCHES_TIMEOUT) {
    postNCMPsearches = http.post(`${NCMP_URL}ncmp/v1/ch/id-searches`, JSON.stringify(searchesBody), cm_ParamsNoAuth);
    try {
      responseBody = JSON.parse('' + postNCMPsearches.body);
      temp = 'Waiting for cmHandle count will be: ' + count + ' Number of CmHandles [in while loop]: ' + responseBody.length;
      if (temp !== msg) {
        msg = temp;
        console.log(temp);
      }
    } catch (error) {
      console.log('Error occured when parsing NCMP id-searches response body: ' + error);
      responseBody = postNCMPsearches.body;
    }
    elapsedMilliseconds = Date.now() - startTime;
    sleep(ID_SEARCHES_SLEEP);
  }
  console.log('Process took ' + fancyTimeFormat(elapsedMilliseconds));
  if (responseBody != null) {
    const res = check(postNCMPsearches, {
      ['NCMP ID-searches endpoint is status 200']: () => postNCMPsearches.status === 200,
      ['cmHandle count is: ' + responseBody.length]: () => responseBody.length >= count,
      ['Flow finished before timeout in: ' + fancyTimeFormat(elapsedMilliseconds)]: () => elapsedMilliseconds < ID_SEARCHES_TIMEOUT,
    });
    if (!res) {
      errorCounter.add(1);
    }
  }
  return responseBody;
}

/*
  This function waits for CTS discover for "min" minutes. Parameters:
  ctsType: type of CTS discovered, eg. gnbcucp, gnbcuup, gnbdu
  min: timeout time in minutes
  errCounter (true/false): whether the production CI flow should fail or not
  true: fails, false: does not fail.
  cmHandleCount : the number of discovered cmHandle
*/
export function cmHandleCountCheck(count) {
  const DISCOVERY_TIMEOUT = 1200000; // 20 minutes in msec
  let getCMHandles,
    processCMHandles = true,
    responseBody;
  let startTime = Date.now(),
    elapsedMilliseconds = 0;
  while (processCMHandles) {
    getCMHandles = http.get(NCMP_URL + 'cps/api/v1/dataspaces/NFP-Operational/anchors', cm_ParamsNoAuth);
    responseBody = JSON.parse(getCMHandles.body);
    console.log('response status: ' + getCMHandles.status);
    console.log('Anchors count: ' + responseBody.length);
    elapsedMilliseconds = Date.now() - startTime;
    console.log('elapsed milliseconds: ' + elapsedMilliseconds);
    if (responseBody.length === count + 1 || elapsedMilliseconds >= DISCOVERY_TIMEOUT) {
      processCMHandles = false;
    } else {
      sleep(10);
    }
  }
  const res3 = check(getCMHandles, {
    'Discovery flow status 200': () => getCMHandles.status === 200,
    ['Received all CmHandles (' + count + ')']: () => responseBody.length === count + 1,
    'Discovery completed in 20 mins (WORKAROUND)': () => elapsedMilliseconds <= DISCOVERY_TIMEOUT,
  });
  if (!res3) {
    errorCounter.add(1);
  }
}

/*
  This function waits for CTS discover for "min" minutes. Parameters:
  ctsType: type of CTS discovered, eg. gnbcucp, gnbcuup, gnbdu
  min: timeout time in minutes
  errCounter (true/false): whether the production CI flow should fail or not
  true: fails, false: does not fail.
  cmHandleCount : the number of discovered cmHandle
*/
export function statusCTSdiscovery(ctsType, min, errCounter, cmHandleCount) {
  let min_sec = min * 60000;
  let getTopology,
    processTopology = true,
    ctscount,
    ctsCounter = {};
  let startTime = Date.now(),
    elapsedMilliseconds,
    elapsedMinutes = 0;
  while (processTopology && Date.now() - startTime < min_sec) {
    getTopology = http.get(TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}Task/count`, getCTS_Params);
    try {
      ctscount = getTopology.body;
      console.log(ctsType + ' count: ' + ctscount);
      elapsedMilliseconds = Date.now() - startTime;
      elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);
      console.log('Response status: ' + getTopology.status + ' - ' + ctsType + ' count: ' + ctscount + ' - Elapsed time: ' + fancyTimeFormat(elapsedMilliseconds));
      if (getTopology.status !== 0) {
        ctsCounter[Date.now()] = ctscount;
        console.log(ctsCounter);
      }
      if (ctscount >= cmHandleCount || elapsedMinutes >= min) {
        processTopology = false;
      } else {
        sleep(20);
      }
    } catch (error) {
      console.log('Error occured during CTS database query: ' + error);
    }
    if (processTopology != false) {
      if (cmHandleCount <= 200) {
        sleep(10);
      } else if (cmHandleCount < 400) {
        sleep(40);
      } else if (cmHandleCount < 2000) {
        sleep(160);
      } else {
        sleep(580);
      }
    }
  }
  if (getTopology.body != null) {
    const res = check(getTopology, {
      ['Get ' + ctsType + ' is status 200']: () => getTopology.status === 200,
      ['List of ' + ctsType + ' has expected count: ' + ctscount]: () => ctscount == cmHandleCount,
      ['Flow finished under ' + min + ' minutes in ' + fancyTimeFormat(elapsedMilliseconds)]: () => elapsedMinutes < min,
    });
    console.log('Topology discovery finished in ' + fancyTimeFormat(elapsedMilliseconds));
    if (!res && errCounter) {
      errorCounter.add(1);
    }
  }
  return ctsCounter;
}
export function statusTIEHdiscovery(tiehType, min, cmHandleCount) {
  let min_sec = min * 60000;
  let startTime = Date.now(),
    elapsedMilliseconds,
    elapsedMinutes = 0,
    tiehcount = 0,
    getTopology;
  let processTopology = true;
  while (processTopology && Date.now() - startTime < min_sec) {
    getTopology = http.get(TIEH_URL + `topology-inventory/v1alpha11/domains/RAN/entity-types/${tiehType}/entities`);
    try {
      let response = JSON.parse(getTopology.body);
      tiehcount = response['totalCount'];
      elapsedMilliseconds = Date.now() - startTime;
      elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);

      if (tiehcount >= cmHandleCount || elapsedMinutes >= min) {
        processTopology = false;
      } else {
        sleep(20);
      }
      console.log('Response status: ' + getTopology.status + ' - ' + tiehType + ' count: ' + tiehcount);
    } catch (error) {
      console.log('Error occured during TIEH database query: ' + error);
    }
  }
  const res = check(getTopology, {
    [`List of ${tiehType} is not empty: ${tiehcount}`]: () => tiehcount >= cmHandleCount,
  });
}
export function statusCTSdiscoveryPE(ctsType, min, errCounter, cmHandleCount) {
  let min_sec = min * 60000;
  let getTopology,
    processTopology = true,
    ctscount,
    filteredData,
    url,
    ctsCounter = {};
  let startTime = Date.now(),
    elapsedMilliseconds,
    elapsedMinutes = 0;
  if (ctsType != 'ltecell' && ctsType != 'enodeb') {
    url = TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}?criteria=(name%20LIKE%20'%25RadioT%25')`;
  } else {
    url = TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}?criteria=(name%20LIKE%20'%25ERBST%25')`;
  }
  while (processTopology && Date.now() - startTime < min_sec) {
    if (ctsType === 'enodeb') {
      ctscount = 1;
    } else {
      ctscount = 0;
    }
    getTopology = http.get(
      //TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}?criteria=(name%2520LIKE%2520%27%2525RadioT%2525%27)`,
      url,
      getCTS_Params
    );
    try {
      // console.log(`getTopology.body :>>  ${getTopology.body}`);
      filteredData = JSON.parse(getTopology.body);
      console.log(`After parsing, getTopology.body length is ${filteredData.length}`);
    } catch (error) {
      console.log(`Error while parsing getTopology.body :>> ${error}`);
    }
    if (['gnbdu', 'nrcell', 'nrsectorcarrier'].includes(ctsType)) {
      const additionalUrl = TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}?criteria=(name%20LIKE%20'%25CORE5GT137%25')`;
      const additionalTopology = http.get(additionalUrl, getCTS_Params);

      try {
        const additionalFilteredData = JSON.parse(additionalTopology.body);
        ctscount += additionalFilteredData.length;
        console.log(`Additional ${ctsType} count: ${additionalFilteredData.length}`);
      } catch (error) {
        console.log(`Error while parsing additional ${ctsType} count: ${error}`);
      }
    }

    try {
      ctscount += filteredData.length;
      console.log(ctsType + ' count: ' + ctscount);
      elapsedMilliseconds = Date.now() - startTime;
      elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);
      console.log('Response status: ' + getTopology.status + ' - ' + ctsType + ' count: ' + ctscount + ' - Elapsed time: ' + fancyTimeFormat(elapsedMilliseconds));
      if (getTopology.status !== 0) {
        ctsCounter[Date.now()] = ctscount;
        console.log(ctsCounter);
      }
      if (ctscount >= cmHandleCount || elapsedMinutes >= min) {
        processTopology = false;
      } else {
        sleep(20);
      }
    } catch (error) {
      console.log('Error occured during CTS database query: ' + error);
    }
    if (processTopology != false) {
      if (cmHandleCount <= 200) {
        sleep(10);
      } else if (cmHandleCount < 400) {
        sleep(40);
      } else if (cmHandleCount < 2000) {
        sleep(160);
      } else {
        sleep(580);
      }
    }
  }

  if (getTopology.body != null) {
    const res = check(getTopology, {
      ['Get ' + ctsType + ' is status 200']: () => getTopology.status === 200,
      ['List of ' + ctsType + ' are not empty: ' + ctscount]: () => ctscount >= cmHandleCount,
      ['Flow finished under ' + min + ' minutes in ' + fancyTimeFormat(elapsedMilliseconds)]: () => elapsedMinutes < min,
    });
    console.log('Topology discovery finished in ' + fancyTimeFormat(elapsedMilliseconds));
    if (!res && errCounter) {
      errorCounter.add(1);
    }
  }
  return ctsCounter;
}

export function statusCTSdiscoveryPELargeENM(ctsType, min, errCounter, cmHandleCount, filter) {
  let min_sec = min * 60000;
  let ctsCounter = {};
  let startTime = Date.now();
  let elapsedMilliseconds;
  let elapsedMinutes = 0;
  let totalCtscount;
  let processTopology = true;

  while (processTopology && Date.now() - startTime < min_sec) {
    totalCtscount = 0;

    let attempt = 1;
    let ctscount = 0;

    while (attempt <= 5) {
      const url = TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}Task/countByCriteria?.criteria=(name%20LIKE%20'%25${filter}%25')`;
      const getTopology = http.get(url, getCTS_Params);

      try {
        ctscount = Number(getTopology.body);
        if (!isNaN(ctscount)) {
          break;
        }
      } catch (error) {
        console.log('Error occurred during CTS database query: ' + error);
      }

      attempt++;
      sleep(1);
    }

    if (isNaN(ctscount)) {
      console.error('Maximum number of attempts reached. Aborting further attempts for this chunk.');
      processTopology = false;
      break;
    }

    totalCtscount += ctscount;

    elapsedMilliseconds = Date.now() - startTime;
    elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);

    console.log(ctsType + ' count: ' + totalCtscount + ' - Elapsed time: ' + fancyTimeFormat(elapsedMilliseconds));

    if (totalCtscount >= cmHandleCount || elapsedMinutes >= min) {
      processTopology = false;
    } else {
      sleep(20);
    }
  }

  if (totalCtscount) {
    const res = check(null, {
      ['The ' + ctsType + ' count is: ' + totalCtscount + ', should be: ' + cmHandleCount]: () => totalCtscount >= cmHandleCount,
      [ctsType + ' flow finished under ' + min + ' minutes in ' + fancyTimeFormat(elapsedMilliseconds)]: () => elapsedMinutes < min,
    });

    console.log('Topology discovery finished in ' + fancyTimeFormat(elapsedMilliseconds));

    if (!res && errCounter) {
      errorCounter.add(1);
    }
  }

  return totalCtscount;
}

export function CTScleanupCheck(ctsType, min, cmHandleCount, errCounter) {
  let timeout = min * 60000;
  let getTopology,
    processTopology = true,
    ctscount;
  let startTime = Date.now(),
    elapsedMinutes = 0;
  let temp, msg, msg1;
  while (processTopology && Date.now() - startTime < timeout) {
    getTopology = http.get(TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}Task/count`, getCTS_Params);
    temp = 'response status: ' + getTopology.status;
    if (temp !== msg) {
      msg = temp;
      console.log(temp);
    }
    try {
      ctscount = getTopology.body;
      elapsedMinutes = Math.floor((Date.now() - startTime) / 60000);
      console.log(ctsType + ' count: ' + ctscount);
      console.log('elapsed minutes: ' + elapsedMinutes);
      if (ctscount <= cmHandleCount) {
        processTopology = false;
        console.log(ctsType + ': ' + getTopology.body);
      } else {
        sleep(20);
      }
    } catch (error) {
      console.log('Error occured during CTS database query: ' + error);
      console.log('Probably there is a CTS POD restart, please check it!');
    }
    sleep(10);
    console.log('processTopology :>> ', processTopology);
    console.log('Date.now() - startTime:>> ', Date.now() - startTime);
    (temp = 'timeout :>> '), timeout;
    if (temp !== msg) {
      msg = temp;
      console.log(temp);
    }
  }
  try {
    console.log('ctscount :>> ', ctscount);
    const res = check(getTopology, {
      ['Get ' + ctsType + ' is status 200']: () => getTopology.status === 200,
      ['List of ' + ctsType + ' is empty: ' + ctscount]: () => ctscount <= cmHandleCount,
      ['Flow finished under ' + min + ' minutes']: () => elapsedMinutes < min,
    });
    if (!res && errCounter) {
      errorCounter.add(1);
    }
  } catch (error) {
    console.log('Error occured during CTS database query: ' + error);
    console.log('Probably there is a CTS POD restart, please check it!');
    const res2 = check(getTopology, {
      ['Get ' + ctsType + ' is status 200']: () => getTopology.status === 200,
      ['Flow finished under ' + min + ' minutes']: () => elapsedMinutes < min,
    });
  }
}
export function TIEHcleanupCheck(tiehType, min) {
  let timeout = min * 60000;
  let processTopology = true,
    getTopology;
  let startTime = Date.now();
  let tiehcount;
  while (processTopology && Date.now() - startTime < timeout) {
    getTopology = http.get(TIEH_URL + `topology-inventory/v1alpha11/domains/RAN/entity-types/${tiehType}/entities`);
    try {
      let response = JSON.parse(getTopology.body);
      console.log('TIEH ' + tiehType + ' body: ' + getTopology.body);
      tiehcount = response['totalCount'];
      console.log(tiehType + ' count: ' + tiehcount);
      if (tiehcount <= 1) {
        processTopology = false;
        console.log(tiehType + ': ' + tiehcount);
      } else {
        sleep(10);
      }
    } catch (error) {
      console.log('Error occured during TIEH database query: ' + error);
    }
  }
  const res = check(getTopology, {
    ['List is empty:']: () => tiehcount <= 1,
  });
}

export function verifycmHandleinCTS(ctsType, min, errCounter, cmHandleId, debug) {
  let min_sec = min * 60000;
  let getTopology,
    processTopology = true,
    responseBody;
  let startTime = Date.now(),
    elapsedMilliseconds,
    elapsedMinutes = 0;
  while (processTopology && Date.now() - startTime < min_sec) {
    getTopology = http.get(TOPOLOGY_CORE_URL + `oss-core-ws/rest/ctw/${ctsType}?externalId=%25${cmHandleId}%25`, getCTS_Params);
    if (getTopology.body != null) {
      console.log('response status: ' + getTopology.status);
      responseBody = JSON.parse(getTopology.body);
      console.log('Anchors count: ' + responseBody.length);
      elapsedMilliseconds = Date.now() - startTime;
      elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);
      console.log('elapsed time: ' + elapsedMilliseconds);
      if (responseBody.length > 0 || elapsedMinutes >= min) {
        processTopology = false;
        if (debug === 1) {
          console.log('Anchors: ' + getTopology.body);
        }
      } else {
        sleep(20);
      }
    }
    sleep(10);
  }
  if (responseBody != null) {
    const res = check(getTopology, {
      ['Get ' + ctsType + ' is status 200']: () => getTopology.status === 200,
      ['List of ' + ctsType + ' are not empty: ' + responseBody.length]: () => responseBody.length > 0,
      ['Flow finished under ' + min + ' minutes in ' + elapsedMilliseconds + ' milliseconds']: () => elapsedMinutes < min,
    });
    if (!res && errCounter) {
      errorCounter.add(1);
    }
  }
}

export function verifycmHandleinTIEH(tiehType, min, cmHandleId) {
  let min_sec = min * 60000;
  let getTopology,
    processTopology = true,
    responseBody,
    filteredCount;
  let startTime = Date.now(),
    elapsedMilliseconds,
    elapsedMinutes = 0;
  while (processTopology && Date.now() - startTime < min_sec) {
    getTopology = http.get(TIEH_URL + `topology-inventory/v1alpha11/domains/RAN/entity-types/${tiehType}/entities?targetFilter=%2FsourceIds&scopeFilter=%2FsourceIds%5Bcontains(%40item%2C'${cmHandleId}')%5D`);
    try {
      responseBody = JSON.parse(getTopology.body);
      console.log('response status: ' + getTopology.status);
      console.log('TIEH ' + tiehType + ' body: ' + getTopology.body);
      elapsedMilliseconds = Date.now() - startTime;
      elapsedMinutes = Math.floor(elapsedMilliseconds / 60000);
      filteredCount = responseBody['totalCount'];
      console.log('elapsed time: ' + elapsedMilliseconds);
      if (filteredCount > 0 || elapsedMinutes >= min) {
        processTopology = false;
      } else {
        sleep(20);
      }
    } catch (error) {
      console.log('Error occured during TIEH database query: ' + error);
    }
  }
  if (responseBody != null) {
    const res = check(getTopology, {
      ['Get topology is status 200']: () => getTopology.status === 200,
      [`List of ${tiehType} is not empty: ${filteredCount}`]: () => filteredCount > 0,
    });
  }
}

// set ENM Stub to generate num RadioNode and num Shared-CNF cmHandles
export function setCmHandleCount(num, SN) {
  const setCountBody = {
    generatedQuantity: `${num}`,
    generationEnabled: 'true',
    fourGNodeDnPrefix: `SubNetwork=Europe,SubNetwork=${SN},SubNetwork=NETSimW`,
    fiveGNodeDnPrefix: `SubNetwork=Europe,SubNetwork=${SN},MeContext=%s`,
    fourGNodeNamePrefix: 'LTE01dg1ERBST%05d',
    fiveGNodeNamePrefix: 'NR01gNodeBRadioT%05d',
  };

  console.log('Set the count of cmHandle in registered subsystem to: ' + num);
  let stubFlag = true,
    retries = 1,
    setCmHandleCountPost;
  while (stubFlag && retries <= 6) {
    setCmHandleCountPost = http.post(`${ENM_STUB_URL}api/v1/stub-configs`, JSON.stringify(setCountBody), cm_ParamsNoAuth);
    console.log('setCmHandleCountPost: ', setCmHandleCountPost);

    if (setCmHandleCountPost && (setCmHandleCountPost.status < 200 || setCmHandleCountPost.status >= 300)) {
      console.log('Error setting cmHandle count retrying request');
      console.log('Request Body: ' + setCmHandleCountPost.body);
      retries++;
      sleep(20);
    } else {
      stubFlag = false;
    }
  }

  console.log('setCmHandleCountPost.status :>> ', setCmHandleCountPost.status);
  const res = check(setCmHandleCountPost, {
    ['Set cmHandleCount to ' + num]: () => setCmHandleCountPost.status === 202,
  });
}

export function fancyTimeFormat(duration) {
  duration = duration / 1000;
  // Hours, minutes and seconds
  var hrs = ~~(duration / 3600);
  var mins = ~~((duration % 3600) / 60);
  var secs = ~~duration % 60;

  // Output like "1:01" or "4:03:59" or "123:03:59"
  var ret = '';

  if (hrs > 0) {
    ret += '' + hrs + 'h' + ' : ' + (mins < 10 ? '0' : '');
  }

  ret += '' + mins + 'm' + ' : ' + (secs < 10 ? '0' : '');
  ret += '' + secs + 's';
  return ret;
}

export function sendCommand(command, authToken, url) {
  let fd = new FormData();
  let commandResponse;
  let fetchedNodes = [];
  if (url.slice(-1) !== '/') {
    url += '/';
  }
  describe('Get command response from ENM', function () {
    fd.append('name', 'command');
    fd.append('stream_output', 'true');
    fd.append('command', command);
    const commandHeader = {
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + fd.boundary,
        Cookie: `iPlanetDirectoryPro=${authToken}`,
        'Accept-Encoding': 'gzip, deflate, sdch',
        Accept: 'application/vnd.com.ericsson.oss.scripting+text;VERSION="1"',
        'X-Requested-With': 'XMLHttpRequest',
      },
    };
    let jobResponse = http.post(url + 'server-scripting/services/command', fd.body(), commandHeader);
    let jobid = `${jobResponse.body}`;
    const res1 = check(jobResponse, {
      'Get command job id from ENM -> Status is 201': (r) => jobResponse.status === 201,
      'Body is not Empty': (r) => jobResponse.body != [],
    });
    if (!res1) {
      console.log('jobResponse body: ' + jobResponse.body);
      errorCounter.add(1);
      errorCounterChar.add(1);
    } else {
      if (__ENV.MY_SCENARIO !== undefined) {
        customMetrics[__ENV.MY_SCENARIO + 'JOB'].add(jobResponse.timings.duration);
        customMetrics[__ENV.MY_SCENARIO + 'JOBDURATION'].add(jobResponse.timings.duration);
      }
      const outputHeader = {
        headers: {
          Cookie: `iPlanetDirectoryPro=${authToken}`,
          'Accept-Encoding': 'gzip, deflate, sdch',
          Accept: 'application/vnd.com.ericsson.oss.scripting.command+json;VERSION="2"',
          'X-Requested-With': 'XMLHttpRequest',
        },
      };
      let processEvents = true;
      let messageCounter = 0;

      while (processEvents) {
        commandResponse = http.get(url + 'server-scripting/services/command/output/' + `${jobid}` + '/stream?_wait_milli=1000', outputHeader);
        let responseBody = JSON.parse(commandResponse.body);
        if (responseBody._response_status !== 'FETCHING') {
          if (responseBody.output._elements.length > 0) {
            for (let i = 0; i < responseBody.output._elements.length; i++) {
              fetchedNodes.push(responseBody.output._elements[i]);
            }
          }
          processEvents = false;
        } else {
          console.log('Response status is: ' + responseBody._response_status);
          for (let i = 0; i < responseBody.output._elements.length; i++) {
            fetchedNodes.push(responseBody.output._elements[i]);
          }
          messageCounter += 1;
          sleep(1);
        }
        if (__ENV.MY_SCENARIO !== undefined) {
          customMetrics[__ENV.MY_SCENARIO + 'COMMAND'].add(commandResponse.timings.duration);
          customMetrics[__ENV.MY_SCENARIO + 'COMMANDDURATION'].add(commandResponse.timings.duration);
        }
      }
      // console.log(JSON.stringify(commandResponse.body));
      const res2 = check(commandResponse, {
        'Get command output from ENM -> Status is 200': (r) => commandResponse.status === 200,
      });
      if (!res2) {
        console.log('commandResponse body: ' + commandResponse.body);
        errorCounter.add(1);
        errorCounterChar.add(1);
      }
    }
  });
  return fetchedNodes;
}

export function convertCommandResponse(commandResponse, pattern) {
  let convertedResponse = [];
  let counter = 0;
  let json = [];
  if (typeof commandResponse === 'string') {
    json = JSON.parse(commandResponse).output._elements;
  } else {
    json = commandResponse;
  }
  for (let i = 0; i < json.length; i++) {
    let currentElement = json[i];
    // we will go through the processed response from the ENM element by element.
    // if the element contains the 'pattern' then we will split by it and use the second part of the string
    // for example: pattern='FDN : ' we will search for the pattern and splitting by it, and returning its value.
    if (currentElement.value.includes(pattern)) {
      let managedElement = currentElement.value.split(pattern);
      const nodes = {
        node: managedElement[1],
      };
      convertedResponse.push(nodes);
      counter += 1;
    }
  }
  const res3 = check(counter, {
    'There is command output in response': (r) => counter >= 0,
  });
  if (!res3) {
    errorCounterChar.add(1);
    errorCounter.add(1);
  }
  return convertedResponse;
}

export function filterResponseForRadioNodes(commandResponse, pattern) {
  let filteredResponse = [];
  for (let i = 0; i < commandResponse.length; i++) {
    let obj = commandResponse[i].node.split('ManagedElement='); //TODO: this works with RadioNodes, not with SharedCNF. We will have to handle it as well.
    if (obj[1].includes(pattern) || (obj[1] == 1 && obj[0].includes(pattern))) {
      let cmhandle = crypto.md5('EricssonENMAdapter-' + commandResponse[i].node, 'hex').toUpperCase();
      const cmhandleMap = {
        fdn: commandResponse[i].node,
        node: obj[1],
        cmhandle: cmhandle,
      };
      filteredResponse.push(cmhandleMap);
    }
  }
  return filteredResponse;
}

export function filterResponseForSharedCNF(commandResponse) {
  let filteredResponse = [];
  for (let i = 0; i < commandResponse.length; i++) {
    let obj = commandResponse[i].node.split(/[=,]/);
    let cmhandle = crypto.md5('EricssonENMAdapter-' + commandResponse[i].node, 'hex').toUpperCase();
    const cmhandleMap = {
      fdn: commandResponse[i].node,
      node: obj[1],
      cmhandle: cmhandle,
    };
    filteredResponse.push(cmhandleMap);
  }
  return filteredResponse;
}

export function generateNRCellDUName(node, currentCell) {
  return ''.concat(node, '-TEST-', currentCell);
}

export function getMetricValue(url, metric, type) {
  let metricValue = 0;
  if (url.slice(-1) !== '/') {
    url += '/';
  }
  try {
    const res = http.get(url + 'actuator/metrics/' + metric);
    if (res.status === 200) {
      var resMap = JSON.parse(res.body);
      var measurementsArray = resMap.measurements;
      for (let i = 0; i < measurementsArray.length; i++) {
        if (measurementsArray[i].statistic === type) {
          metricValue = measurementsArray[i].value;
        }
      }
      /*if(metricValue === 0){
            console.log('There is no statistic type ' + type + ' under ' + metric);
          }*/
    } else if (res.status === 404 && res.body === '') {
      console.log('There is no metric being collected under the name of ' + metric);
    } else {
      console.log('This service does not have an actuator endpoint!');
    }
  } catch (error) {
    console.log(error.message);
  }
  return metricValue;
}

let count = 0;
export function registerENM(where) {
  let name = `enm-8281:eric-oss-restsim-release-for-app-eng${count++}:80`;
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  const postENM_body = JSON.stringify({
    subsystemType: {
      type: 'DomainManager',
    },
    healthCheckTime: '1h',
    name: `${name}`,
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

  let registerEnm = http.post(`${OUTSIDE_API_GW_TLS_URL}subsystem-manager/v1/subsystems`, postENM_body, head);

  let subsystemId = JSON.parse(registerEnm.body).id;
  const res = check(registerEnm, {
    'ENM registration was successful (status: 201)': (r) => registerEnm.status === 201,
  });
  console.log(where + ' Body of registered ENM: ' + registerEnm.body);
  console.log(where + ' ID of registered ENM: ' + subsystemId);
  if (!res) {
    console.log(where + ' ENM subsystem creation: ' + registerEnm.body);
    console.log(where + ' ENM subsystem creation: ' + registerEnm.status);
    console.log(where + ' ENM subsystem creation: ' + subsystemId);
    errorCounter.add(1);
  }

  return [subsystemId, name];
}

export function getSubsystemId(ENMurl) {
  const sessionId = authorize();
  const head = {
    headers: {
      'content-type': `application/json`,
      Cookie: `JSESSIONID=${sessionId}`,
    },
  };
  let subsystemList = http.get(OUTSIDE_API_GW_TLS_URL + 'subsystem-manager/v3/subsystems', '', head);
  let responsebody = JSON.parse(subsystemList.body);
  let subsystemId;
  if (responsebody.length > 0) {
    for (let i = 0; i < responsebody.length; i++) {
      if (responsebody[i].url === ENMurl) {
        subsystemId = responsebody[i].id;
        console.log(' Subsystem: ID :>> ' + subsystemId + '  Name :>> ' + responsebody[i].name);
      }
    }
  } else {
    console.log('No Subsystems registered with the url :>> ' + ENMurl);
  }
  return subsystemId;
}

export function startFrame(text) {
  text = '|--- ' + text + ' ---|';
  let separator = '|';
  for (let i = 0; i < text.length - 2; i++) {
    separator += '-';
  }
  separator += '|';
  console.log(separator);
  console.log(text);
  console.log(separator);
}

export function endLine(text) {
  console.log('|----- ' + text + ' -----|');
}

function fetchManagedElementId(cmHandleId, headSef) {
  const url = IAM_HOST + `ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:passthrough-operational?resourceIdentifier=%2F`;

  let retries = 10;
  let fetchedManagedElementId = '';

  while (retries > 0) {
    try {
      const response = http.get(url, headSef);

      if (response && response.json('ManagedElement')) {
        const managedElement = response.json('ManagedElement')[0];
        fetchedManagedElementId = managedElement.id || '';
        if (fetchedManagedElementId !== '') {
          const duration = response.timings.duration / 1000; // Convert to seconds
          console.log(`Fetched managedElementId for cmHandleId ${cmHandleId}: ${fetchedManagedElementId}. Duration: ${duration}s`);
          break;
        }
      } else {
        const duration = response.timings.duration / 1000; // Convert to seconds
        console.log(`Duration: ${duration}s`);
        console.log('response.body :>> ', response.body);
        console.log('response.status :>> ', response.status);
        if (response.status === 200) {
          break;
        }
      }
    } catch (error) {
      console.error('Error fetching managedElementId:', error);
    }

    retries--;
    sleep(10); // Sleep for 10 seconds between retries
  }

  return fetchedManagedElementId;
}

export function extractCmHandleAndManagedElementIds(response, headSef) {
  let cmHandleIds = [];

  if (Array.isArray(response)) {
    cmHandleIds = response;
  } else {
    try {
      cmHandleIds = JSON.parse(response);
    } catch (error) {
      console.error('Error parsing response:', error);
      return { result: [], responseArray: [] };
    }
  }
  const result = [];
  const responseArray = [];

  const middleIndex = Math.floor(cmHandleIds.length / 2);

  for (let i = 0; i <= middleIndex; i++) {
    const currentIndex = middleIndex + i;
    const nextIndex = middleIndex - i;

    if (currentIndex < cmHandleIds.length) {
      const cmHandleId = cmHandleIds[currentIndex];
      console.log(`Processing cmHandleId: ${cmHandleId}`);
      const fetchedManagedElementId = fetchManagedElementId(cmHandleId, headSef);

      const item = {
        cmHandleId: cmHandleId,
        managedElementId: fetchedManagedElementId,
      };

      responseArray.push(item);
      console.log(`Fetched pair: ${JSON.stringify(item)}`);

      if (fetchedManagedElementId !== '') {
        if (fetchedManagedElementId.includes('Radio')) {
          result.push(item);
          console.log(`Terminating early. Found pair with "Radio".`);
          break; // Terminate early if a pair containing "Radio" is found
        }
      }

      sleep(0.1); // Sleep for 100 milliseconds between parallel requests
    }

    if (nextIndex >= 0 && nextIndex !== currentIndex && nextIndex < cmHandleIds.length) {
      const cmHandleId = cmHandleIds[nextIndex];
      console.log(`Processing cmHandleId: ${cmHandleId}`);
      const fetchedManagedElementId = fetchManagedElementId(cmHandleId, headSef);

      const item = {
        cmHandleId: cmHandleId,
        managedElementId: fetchedManagedElementId,
      };

      responseArray.push(item);
      console.log(`Fetched pair: ${JSON.stringify(item)}`);

      if (fetchedManagedElementId !== '') {
        if (fetchedManagedElementId.includes('Radio')) {
          result.push(item);
          console.log(`Terminating early. Found pair with "Radio".`);
          break; // Terminate early if a pair containing "Radio" is found
        }
      }

      sleep(0.1); // Sleep for 100 milliseconds between parallel requests
    }
  }

  return { result, responseArray };
}

export function checkRestSimStatus(restsim_url) {
  const STATUS_POLL_TIME = 10; // 10 seconds
  const STATUSCHECK_TIMEOUT = 5 * 60 * 1000; // 5 min is enough
  const url = restsim_url + '/status';
  let startTime = Date.now(),
    elapsedMilliseconds = 0,
    getStatusCheck,
    processStatusCheck = true;
  console.log('Request:', url);
  while (processStatusCheck) {
    getStatusCheck = http.get(url, cm_ParamsNoAuth);
    elapsedMilliseconds = Date.now() - startTime;
    if (getStatusCheck.status === 200 || elapsedMilliseconds >= STATUSCHECK_TIMEOUT) {
      processStatusCheck = false;
      console.log('RESTSim status is ' + getStatusCheck.status);
    } else {
      console.log('RESTSim status is :>> ', getStatusCheck.status);
      sleep(STATUS_POLL_TIME);
    }
    console.log('elapsed milliseconds: ' + elapsedMilliseconds);
  }
  const res = check(getStatusCheck, {
    'RESTSim status is 200': () => getStatusCheck.status === 200,
  });
  if (!res) {
    console.log('RESTSim status is ' + getStatusCheck.status + ' after 5 minutes. Please check the eric-oss-restsim-release-for-app-eng pod in the deployment');
    return false;
  } else {
    return true;
  }
}

export function login(enm_url) {
  let authToken = '';
  const loginHeader = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (enm_url.slice(-1) !== '/') {
    enm_url += '/';
  }
  console.log('ENM URL: ' + enm_url);
  let params = `IDToken1=${enm_username}&IDToken2=${enm_password}`;
  let res = http.post(enm_url + 'login', params, loginHeader);
  if (res.status === 200) {
    console.log(JSON.stringify(res.body));
    const jar = http.cookieJar();
    const cookies = jar.cookiesForURL(enm_url);
    console.log(cookies.iPlanetDirectoryPro[0]);
    authToken = cookies.iPlanetDirectoryPro[0];
  } else {
    console.log('Login has failed! Response status: ' + res.status + ' || Error body: ' + res.body);
    errorCounter.add(1);
  }
  return authToken;
}

export function resetEvents(kafkaTopic, consumerGroup) {
  console.log("Reset events from '" + kafkaTopic + "' Kafka topic for ID: " + consumerGroup);
  let messages = kafka.readEvents(20000, 100000, kafkaTopic, true);
  console.log('Consumed ' + messages.length + ' messages');
}

export function checkEvents(kafkaTopic, consumerGroup, cmHandle_id, isSharedCNF) {
  let finalNumberOfDmaapEvents; // Every event is at first goes to ADVISED then READY state -> (*2)

  let readyStateEventOK = false;

  console.log('Check events of CMHandle ' + cmHandle_id + " on '" + kafkaTopic + "' Kafka topic for ID: " + consumerGroup);

  isSharedCNF ? (finalNumberOfDmaapEvents = 6) : (finalNumberOfDmaapEvents = 2);
  let messages = kafka.readEvents(60000, finalNumberOfDmaapEvents, kafkaTopic, false);
  for (const event of messages) {
    const eventObj = JSON.parse(event.value);
    console.log('Event state of CMHandle ' + eventObj.event.cmHandleId + ': ' + eventObj.event.newValues.cmHandleState);
    if (eventObj.eventType == 'org.onap.ncmp.cmhandle-lcm-event.update' && eventObj.event.newValues.cmHandleState == 'READY' && eventObj.event.cmHandleId == cmHandle_id) {
      readyStateEventOK = true;
    }
  }
  const checkIfCorrectNumberOfEvent = check(messages, {
    ['Expected number of events (' + finalNumberOfDmaapEvents + '), and actually received events (' + messages.length + ') are equal']: (r) => messages.length == finalNumberOfDmaapEvents,
  });

  check(readyStateEventOK, {
    'Event READY received': () => readyStateEventOK == true,
  });

  if (!checkIfCorrectNumberOfEvent) {
    console.log('Number of actually received events: ' + messages.length);
    console.log('Number of events that should have been received: ' + finalNumberOfDmaapEvents);
  }
}

export function goodRadioNodesCountfromENM(response) {
  let counter = 0;

  for (let i = 0; i < response.length; i += 2) {
    const networkElementValue = response[i].value;
    const softwareSyncStatusValue = response[i + 1].value;

    if (softwareSyncStatusValue.includes('softwareSyncStatus : AS_IS') || softwareSyncStatusValue.includes('softwareSyncStatus : TREAT_AS')) {
      counter++;
    }
  }

  return counter;
}

export function filterResponse(response1, response2) {
  const filteredResponse1 = [];
  const currentNetworkElements = {};

  let currentNetworkElement = null;
  let softwareSyncStatus = null;
  for (const entry of response2) {
    if (entry.type === 'text' && entry.value.startsWith('FDN : NetworkElement=')) {
      currentNetworkElement = entry.value.split('=')[1];
    } else if (entry.type === 'text' && entry.value.includes('softwareSyncStatus')) {
      softwareSyncStatus = entry.value.split(':')[1].trim();
      if (softwareSyncStatus === 'AS_IS' || softwareSyncStatus === 'TREAT_AS') {
        currentNetworkElements[currentNetworkElement] = true;
      }
    }
  }

  for (const obj of response1) {
    for (const networkElement in currentNetworkElements) {
      if (obj.node.includes(networkElement)) {
        filteredResponse1.push(obj);
        break;
      }
    }
  }

  return filteredResponse1;
}

export function countNetworkElements(data) {
  let count4G = 0;
  let count5G = 0;
  let networkFunctionCounts = {
    ENodeB: 0,
    GNBDU: 0,
    GNBCUCP: 0,
    GNBCUUP: 0,
  };

  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    if (element.type === 'text' && element.value.includes('radioAccessTechnology : [4G]')) {
      count4G++;
    }

    if (element.type === 'text' && element.value.includes('radioAccessTechnology : [5G]')) {
      count5G++;
    }

    if (element.type === 'text' && element.value.includes('radioAccessTechnology : [4G, 5G]')) {
      count4G++;
      count5G++;
    }

    if (element.type === 'text' && element.value.includes('networkFunctions : [')) {
      const functions = element.value
        .split('[')[1]
        .split(']')[0]
        .split(', ')
        .map((item) => item.trim());

      functions.forEach((func) => {
        networkFunctionCounts[func]++;
      });
    }
  }

  return {
    count4G: count4G,
    count5G: count5G,
    enodeb: networkFunctionCounts.ENodeB,
    gnbdu: networkFunctionCounts.GNBDU,
    gnbcucp: networkFunctionCounts.GNBCUCP,
    gnbcuup: networkFunctionCounts.GNBCUUP,
  };
}

export function countNetworkElementsRestsim(authToken1, restsim_url) {
  const STATUS_POLL_TIME = 10; // 10 seconds
  const STATUSCHECK_TIMEOUT = 5 * 60 * 1000; // 5 min is enough
  let count4G = 0;
  let count5G = 0;
  let cmHandlecounts = 0;
  let networkFunctionCounts = {
    ENodeB: 0,
    GNBDU: 0,
    GNBCUCP: 0,
    GNBCUUP: 0,
    NRCell: 0,
    NRSectorCarrier: 0,
    LTECell: 0,
  };
  const commandHeader = {
    headers: {
      Cookie: `iPlanetDirectoryPro=${authToken1}`,
      'Accept-Encoding': 'gzip, deflate, sdch',
    },
  };

  console.log('authToken1 :>> ', authToken1);
  const url = restsim_url + '/restsim/metadata';
  var responseData;
  let startTime = Date.now(),
    elapsedMilliseconds = 0,
    getStatusCheck,
    processStatusCheck = true;
  console.log('Request:', url);
  while (processStatusCheck) {
    getStatusCheck = http.get(url, commandHeader);
    elapsedMilliseconds = Date.now() - startTime;
    if (getStatusCheck.status === 200) {
      try {
        responseData = JSON.parse(getStatusCheck.body);
        processStatusCheck = false;
        console.log('RESTSim metadata status is ' + getStatusCheck.status);
      } catch (error) {
        console.error('The response is not a valid JSON object.');
        console.log('RESTSim metadata status is :>> ', getStatusCheck.status);
        sleep(STATUS_POLL_TIME);
      }
    } else if (elapsedMilliseconds >= STATUSCHECK_TIMEOUT) {
      console.error('Timeout reached while waiting for response.');
      processStatusCheck = false;
    } else {
      console.log('RESTSim metadata status is :>> ', getStatusCheck.status);
      sleep(STATUS_POLL_TIME);
    }
    console.log('elapsed milliseconds: ' + elapsedMilliseconds);
  }
  try {
    count4G = parseInt(responseData['Other MOs']['ENodeBFunction']);
    count5G = parseInt(responseData['Other MOs']['GNBDUFunction']);
    cmHandlecounts = parseInt(responseData['ManagedElements']);
    networkFunctionCounts = {
      ENodeB: parseInt(responseData['Other MOs']['ENodeBFunction']),
      GNBDU: parseInt(responseData['Other MOs']['GNBDUFunction']),
      GNBCUCP: parseInt(responseData['Other MOs']['GNBCUCPFunction']),
      GNBCUUP: parseInt(responseData['Other MOs']['GNBCUUPFunction']),
      NRCell: parseInt(responseData['Cells']['NRCellDU']),
      NRSectorCarrier: parseInt(responseData['Other MOs']['NRSectorCarrier']),
      LTECell: parseInt(responseData['Cells']['EUtranCellFDD']) + parseInt(responseData['Cells']['EUtranCellTDD']),
    };
  } catch (error) {
    console.error('The response is not a valid JSON object.');
    console.log('responseData :>> ', responseData);
  }

  return {
    count4G: count4G,
    count5G: count5G,
    enodeb: networkFunctionCounts.ENodeB,
    gnbdu: networkFunctionCounts.GNBDU,
    gnbcucp: networkFunctionCounts.GNBCUCP,
    gnbcuup: networkFunctionCounts.GNBCUUP,
    nrcell: networkFunctionCounts.NRCell,
    nrsectorcarrier: networkFunctionCounts.NRSectorCarrier,
    ltecell: networkFunctionCounts.LTECell,
    cmHandlecounts: cmHandlecounts,
  };
}

export function removeTrailingSlash(url) {
  return url.replace(/\/$/, '');
}
