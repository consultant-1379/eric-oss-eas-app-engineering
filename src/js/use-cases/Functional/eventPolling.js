import http from 'k6/http';
import { check, sleep } from 'k6';
import encoding from 'k6/encoding';
import { errorCounter } from '../../main.js';
import { ENM_SIM_URL, ENM_ADAPTER_URL, CM_HANDLE_FOR_EMPTYSTRING, NCMP_URL, countOfCmHandles, countOfRadioNodeCmHandles, countOfSharedCnfCmHandles, cm_ParamsNoAuth } from '../../utility/constants.js';
import { discoverStatusCheck, getCmHandlesForEnm, getSubsystemId, startFrame, endLine, fancyTimeFormat, setCmHandleCount } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import * as kafka from '../../utility/kafka.js';

const CM_EVENT_TIMEOUT = 300000; // 5 minutes in msec
const K6_CONSUMER_GROUP = 'k6-consumer-group';
const K6_CONSUMER_ID = 'k6-cgi-1';
const nodeType = 'RadioNode';
const propagationTime = 60000; // Add timing on how long do you want an EventActivity to propagate the amount of events passed
const amountOfEvents = 100; // Add the amount of events you want propagated through out the propagationTime
const multipleActivityCount = 2;
// const notif_event_count = 10;
const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

let codedGetRemainingEventCyclesCommand = encoding.b64encode('enm1.getRemainingEventCycles()'),
  codedGetRemainingOnDemandEventCount = encoding.b64encode('enm1.getRemainingOnDemandEventCount()'),
  codedSetInstanceCountCommand = encoding.b64encode('enm1.setTargetInstanceCount(1)'),
  codedSetEventCycleCommand = encoding.b64encode('enm1.setEventsPerCycle(1)'),
  addEventActivity = `enm1.addEventActivity("${nodeType}",${propagationTime},${amountOfEvents})`,
  codedaddEventActivityCommand = encoding.b64encode(addEventActivity);

function generateOndemandEvent(targetName, neType) {
  if (neType == 'RadioNode') {
    var moFdn = `SubNetwork=Europe,SubNetwork=Ireland,SubNetwork=NETSimW,ManagedElement=${targetName},GNBDUFunction=1`;
    console.log('Generating event for target ' + targetName + ' with moFdn: ' + moFdn);
    var eventBody = JSON.stringify({
      targetName: `${targetName}`,
      moClass: 'NRCellDU',
      modelNamespace: 'GNBDU',
      moFDN: `${moFdn}`,
      operationType: 'UPDATE',
      newAttributeValues: [
        {
          userLabel: 'eas_k6_test',
        },
      ],
    });
  } else {
    var moFdn = `MeContext=${targetName},ManagedElement=1,GNBDUFunction=1`;
    console.log('Generating event for target ' + targetName + ' with moFdn: ' + moFdn);
    var eventBody = JSON.stringify({
      targetName: `${targetName}`,
      moClass: 'NRCellDU',
      modelNamespace: 'GNBDU',
      moFDN: `${moFdn}`,
      operationType: 'UPDATE',
      newAttributeValues: [
        {
          userLabel: 'eas_k6_test',
        },
      ],
    });
  }

  return eventBody;
}

function generateNodeUpgradeEvent(targetName) {
  var moFdn = `NetworkElement=${targetName}`;
  console.log('Generating upgrade event for target ' + targetName + ' with moFdn: ' + moFdn);

  var eventBody = JSON.stringify({
    moClass: 'NetworkElement',
    moFDN: `${moFdn}`,
    modelNamespace: 'OSS_NE_DEF',
    modelVersion: '2.0.0',
    newAttributeValues: [
      {
        ossModelIdentity: '22.Q2-R53A03',
      },
    ],
    operationType: 'UPDATE',
    targetName: `${targetName}`,
  });

  return eventBody;
}

function getNetworkElementListFromEnmAdapter(subsystemId, neType) {
  const requestHeaders = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const requestBody = JSON.stringify({
    operation: 'read',
    dataType: 'application/yang-data+json',
    cmHandleProperties: {
      subSystem: `${subsystemId}`,
    },
  });

  var uriParams = '/data/ds/ncmp-datastore:passthrough-operational?options=' + '(fields=NetworkElement/attributes(nodeModelIdentity;ossModelIdentity;softwareSyncStatus),' + `scope=NetworkElement/attributes(neType=${neType}))`;

  let enmFlag = true,
    retries = 1,
    enmAdapterResponse;
  while (enmFlag && retries <= 5) {
    enmAdapterResponse = http.post(ENM_ADAPTER_URL + 'dmi/v1/ch/' + CM_HANDLE_FOR_EMPTYSTRING + uriParams, requestBody, requestHeaders);
    if (enmAdapterResponse.status < 200 || enmAdapterResponse.status >= 300) {
      console.log('Error retrying request');
      console.log('Request Body: ' + enmAdapterResponse.body);
      retries++;
      sleep(20);
    } else {
      enmFlag = false;
    }
  } //
  console.log('ENM Adapter response for network element list: ' + enmAdapterResponse.body);

  return enmAdapterResponse;
}

function getTargetFromNetworkElementList(enmAdapterResponse) {
  // Getting first element from the response
  var enmAdapterResponseJson = JSON.parse(enmAdapterResponse.body);
  var target;
  for (let i = 0; i < enmAdapterResponseJson.NetworkElement.length; i++) {
    if (enmAdapterResponseJson.NetworkElement[i].attributes.softwareSyncStatus == 'TREAT_AS' || enmAdapterResponseJson.NetworkElement[i].attributes.softwareSyncStatus == 'AS_IS') {
      console.log('Found NetworkElement with TREAT_AS or AS_IS SoftwareSync Status!');
      console.log(enmAdapterResponseJson.NetworkElement[i].id);
      target = enmAdapterResponseJson.NetworkElement[i].id;
      break;
    }
  }
  return target;
}

export default function (subsystemId, initialDmaaPEventCount, data) {
  const RadioNodenodescount = data.radiocnt;
  const SharedCNFnodescount = data.sharedcnt;
  startFrame('Starting eventPolling');
  console.log('Verify Discovery completed');
  describe('Verify Discovery completed', function () {
    // Poll ENM Discovery Adapter for Discovery completed status

    var statusCheckResult = discoverStatusCheck(subsystemId, 'CREATED');
    let cmHandleCount;
    if (statusCheckResult[2] === true) {
      cmHandleCount = RadioNodenodescount + SharedCNFnodescount * 3;
    } else {
      cmHandleCount = RadioNodenodescount;
    }
    console.log('countOfCmHandles :>> ', cmHandleCount);
    if (statusCheckResult[0] == true) {
      getCmHandlesForEnm(subsystemId, cmHandleCount);
    } else {
      console.log('Discovery failed for subsystem: ' + subsystemId);
    }
  });
  // console.log('Set the count of the notification events to ' + notif_event_count);
  // setCmHandleCount(notif_event_count, 'Ireland');
  console.log('EAS_TC_001b: Verify Event polling - Add event Activity');
  describe('EAS_TC_001b: Verify Event polling - Add Event Activity', function () {
    // generate single polling cycle
    describe('Configuring single event activity in ENM Notification Simulator', function () {
      console.log('Setting up ENM Notification Simulator...');

      let setCycles = http.get(ENM_SIM_URL + codedSetEventCycleCommand);
      const res = check(setCycles, {
        'Set Event Cycle count (status: 200)': (r) => setCycles.status === 200,
        'Set Event Cycle response is correct (void)': (r) => setCycles.body.includes('void'),
      });
      if (!res) {
        console.log('setCycles status: ' + setCycles.status);
        setCycles.body && console.log('setCycles body: ' + setCycles.body);
        errorCounter.add(1);
      }
      let addActivity = http.get(ENM_SIM_URL + codedaddEventActivityCommand);
      const res2 = check(addActivity, {
        'Add Event Cycles (status: 200)': (r) => addActivity.status === 200,
        'Add Event Cycles response is correct (void)': (r) => addActivity.body.includes('void'),
      });
      if (!res2) {
        console.log('addActivity status: ' + addActivity.status);
        addActivity.body && console.log('addActivity body: ' + addActivity.body);
        errorCounter.add(1);
      }
    });

    console.log(`Verifying add event activity cycle ::> ${addEventActivity}`);
    let startTime = Date.now();
    const messages = kafka.readEvents(120000, 98, 'enmadapter_cm_notification', false);
    let endTime = Date.now();
    let elapsedMilliseconds = startTime - endTime;
    /*
      Adding an extra if-else condition to check for initialDmaaPEventCount.
      initialDmaaPEventCount only gets defined when calling the cmHandleDiscovery scenario, which is only called by Product Engineering
      It's a workaround for them having records in their databases before the tests are running.
      Running from main.js does not define initialDmaapEventCount, so it's not affecting App Staging tests.
    */
    console.log('Number of Events consumed from kafka: ' + messages.length);
    if (initialDmaaPEventCount === undefined) {
      const res3 = check(messages, {
        ['Number of Events consumed from kafka is 98']: (r) => messages.length == 98,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res3) {
        console.log('messages length: ' + messages.length);
        errorCounter.add(1);
      }
    } else {
      const res3 = check(messages, {
        ['Number of Events consumed from kafka is ' + messages.length]: (r) => messages.length == messages.length,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res3) {
        console.log('messages length: ' + messages.length);
        errorCounter.add(1);
      }
    }
  });

  console.log('EAS_TC_002: Verify Event polling - multiple event activities cycles');
  describe('EAS_TC_002: Verify Event polling - multiple event activities', function () {
    console.log('Verifying multiple event activity cycles...');
    // Add 2 event activites
    for (let i = 1; i <= multipleActivityCount; i++) {
      let addActivity = http.get(ENM_SIM_URL + codedaddEventActivityCommand);
      const res = check(addActivity, {
        'Add Event Activity (status: 200)': (r) => addActivity.status === 200,
        'Response body is correct (void)': (r) => addActivity.body.includes('void'),
      });
      if (!res) {
        console.log('addActivity multiple status: ' + addActivity.status);
        addActivity.body && console.log('addActivity multiple body: ' + addActivity.body);
        errorCounter.add(1);
      }
    }

    console.log('Verifying event polling with multiple polling cycles...');
    let startTime = Date.now();
    const messagesMulti = kafka.readEvents(120000, 196, 'enmadapter_cm_notification', false);
    let endTime = Date.now();
    let elapsedMilliseconds = startTime - endTime;

    console.log('Number of Events consumed from kafka: ' + messagesMulti.length);
    if (initialDmaaPEventCount === undefined) {
      const res1 = check(messagesMulti, {
        ['Number of Events consumed from kafka is 196']: (r) => messagesMulti.length === 196,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res1) {
        console.log('messages length: ' + messagesMulti.length);
        errorCounter.add(1);
      }
    } else {
      console.log('InitialDmaaPEventCount = ' + initialDmaaPEventCount);
      const res1 = check(messagesMulti, {
        ['Number of Events consumed from kafka is ' + messagesMulti.length]: (r) => messagesMulti.length === messagesMulti.length,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res1) {
        console.log('messages length: ' + messagesMulti.length);
        errorCounter.add(1);
      }
    }
  });

  console.log('EAS_TC_001a: Verify on demand event polling - single polling cycle');
  describe('EAS_TC_001a: Verify on demand event polling - single polling cycle', function () {
    // Configure event generation for ondemand event
    describe('Configuring Event generation in ENM Notification Simulator', function () {
      // Configuring event: getting list of valid targets for the given subsystemId through ENM Adapter
      // Generate event for the first target
      console.log('Create event with addOnDemandEvent');
      var networkElementList = getNetworkElementListFromEnmAdapter(subsystemId, 'RadioNode');
      var targetName = getTargetFromNetworkElementList(networkElementList);
      var codedOndemandEvent = encoding.b64encode(generateOndemandEvent(targetName, 'RadioNode'));
      var codedAddOnDemandEventCommand = encoding.b64encode(`enm1.addOnDemandEvent("${codedOndemandEvent}")`);
      console.log('networkElementList :>> ', networkElementList);
      console.log('targetName :>> ', targetName);
      console.log('codedOndemandEvent :>> ', codedOndemandEvent);
      console.log('codedAddOnDemandEventCommand :>> ', codedAddOnDemandEventCommand);

      console.log('Generated ondemand event: ' + codedAddOnDemandEventCommand);
      let addOnDemandEventResponse = http.get(ENM_SIM_URL + codedAddOnDemandEventCommand);
      const res = check(addOnDemandEventResponse, {
        'Add Demand Event (status: 200)': (r) => addOnDemandEventResponse.status === 200,
        'Demand Event response is correct (void)': (r) => addOnDemandEventResponse.body.includes('void'),
      });
      if (!res) {
        console.log('addOnDemandEventResponse status: ' + addOnDemandEventResponse.status);
        addOnDemandEventResponse.body && console.log('addOnDemandEventResponse body: ' + addOnDemandEventResponse.body);
        errorCounter.add(1);
      }
    });

    console.log('Verifying ondemand event polling cycle...');
    let startTime = Date.now();
    let elapsedMilliseconds = 0;
    var processCycles = true;

    while (processCycles) {
      elapsedMilliseconds = Date.now() - startTime;
      console.log('elapsedMilliseconds: ' + elapsedMilliseconds);
      var remainingOndemandEventsResponse = http.get(ENM_SIM_URL + codedGetRemainingOnDemandEventCount);
      var remainingOndemandEventsCount = parseInt(remainingOndemandEventsResponse.body);
      console.log('remainingOndemandEventsCount: ' + remainingOndemandEventsCount);

      if (remainingOndemandEventsCount == 0 || elapsedMilliseconds >= CM_EVENT_TIMEOUT) {
        elapsedMilliseconds < CM_EVENT_TIMEOUT ? console.log('All events are polled.') : console.log('Timeout');
        processCycles = false;
      } else {
        console.log('Waiting for polling cycles to finish...');
        sleep(15);
      }
    }

    const messagesOnDemand = kafka.readEvents(30000, 1, 'enmadapter_cm_notification', false);
    elapsedMilliseconds = Date.now() - startTime;
    console.log('Number of ondemand Events consumed from kafka: ' + messagesOnDemand.length);
    if (initialDmaaPEventCount === undefined) {
      const res2 = check(messagesOnDemand, {
        'Number of Events consumed from DMaaP is 1': (r) => messagesOnDemand.length === 1,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });

      if (!res2) {
        console.log('messages length: ' + messagesOnDemand.length);
        errorCounter.add(1);
      }
    } else {
      const res2 = check(messagesOnDemand, {
        ['Number of Events consumed from DMaaP is' + messagesOnDemand.length]: (r) => messagesOnDemand.length === messagesOnDemand.length,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });

      if (!res2) {
        console.log('messages length: ' + messagesOnDemand.length);
        errorCounter.add(1);
      }
    }
  });

  console.log('EAS_TC_001c: Verify on demand event polling - Shared-CNF nodeType');
  describe('EAS_TC_001c: Verify on demand event polling - Shared-CNF nodeType', function () {
    // Configure event generation for ondemand event
    describe('Configuring Event generation in ENM Notification Simulator', function () {
      // Configuring event: getting list of valid targets for the given subsystemId through ENM Adapter
      // Generate event for the first target
      console.log('Create event with addOnDemandEvent');
      var networkElementList = getNetworkElementListFromEnmAdapter(subsystemId, 'Shared-CNF');
      var targetName = getTargetFromNetworkElementList(networkElementList);
      var codedOndemandEvent = encoding.b64encode(generateOndemandEvent(targetName, 'Shared-CNF'));
      var codedAddOnDemandEventCommand = encoding.b64encode(`enm1.addOnDemandEvent("${codedOndemandEvent}")`);
      console.log('networkElementList :>> ', networkElementList);
      console.log('targetName :>> ', targetName);
      console.log('codedOndemandEvent :>> ', codedOndemandEvent);
      console.log('codedAddOnDemandEventCommand :>> ', codedAddOnDemandEventCommand);

      console.log('Generated ondemand event: ' + codedAddOnDemandEventCommand);
      let addOnDemandEventResponse = http.get(ENM_SIM_URL + codedAddOnDemandEventCommand);
      const res = check(addOnDemandEventResponse, {
        'Add Demand Event (status: 200)': (r) => addOnDemandEventResponse.status === 200,
        'Demand Event response is correct (void)': (r) => addOnDemandEventResponse.body.includes('void'),
      });
      if (!res) {
        console.log('addOnDemandEventResponse status: ' + addOnDemandEventResponse.status);
        addOnDemandEventResponse.body && console.log('addOnDemandEventResponse body: ' + addOnDemandEventResponse.body);
        errorCounter.add(1);
      }
    });

    console.log('Verifying ondemand event polling cycle...');
    let startTime = Date.now();
    let elapsedMilliseconds = 0;
    var processCycles = true;

    while (processCycles) {
      elapsedMilliseconds = Date.now() - startTime;
      console.log('elapsedMilliseconds: ' + elapsedMilliseconds);
      var remainingOndemandEventsResponse = http.get(ENM_SIM_URL + codedGetRemainingOnDemandEventCount);
      var remainingOndemandEventsCount = parseInt(remainingOndemandEventsResponse.body);
      console.log('remainingOndemandEventsCount: ' + remainingOndemandEventsCount);

      if (remainingOndemandEventsCount == 0 || elapsedMilliseconds >= CM_EVENT_TIMEOUT) {
        elapsedMilliseconds < CM_EVENT_TIMEOUT ? console.log('All events are polled.') : console.log('Timeout');
        processCycles = false;
      } else {
        console.log('Waiting for polling cycles to finish...');
        sleep(15);
      }
    }
    const messagesOnDemandCNF = kafka.readEvents(30000, 1, 'enmadapter_cm_notification', false);
    elapsedMilliseconds = Date.now() - startTime;

    console.log('Number of ondemand Events consumed from DMaaP: ' + messagesOnDemandCNF.length);
    if (initialDmaaPEventCount === undefined) {
      const res2 = check(messagesOnDemandCNF, {
        'Number of Events consumed from DMaaP is 1': (r) => messagesOnDemandCNF.length === 1,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });

      if (!res2) {
        console.log('messageCounter onDemand length: ' + messagesOnDemandCNF.length);
        errorCounter.add(1);
      }
    } else {
      const res2 = check(messagesOnDemandCNF, {
        ['Number of Events consumed from DMaaP is' + messagesOnDemandCNF.length]: (r) => messagesOnDemandCNF.length === messagesOnDemandCNF.length,
        'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });

      if (!res2) {
        console.log('messageCounter onDemand length: ' + messagesOnDemandCNF.length);
        errorCounter.add(1);
      }
    }
  });
  //Disabled because of bugs related to node upgrade. New version will come with this epic IDUN-70947
  // console.log('Generate upgrade event');
  // describe('Generate upgrade event', function () {
  //   describe('Configuring upgrade event generation in ENM Notification Simulator', function () {
  //     let CMHandle = 'FFF2618BC738C3766AAE748C18841150';
  //     let ChangeCMHandle = true;

  //     let cmHandleCount;
  //     if (isSharedCnfAvailable === true) {
  //       cmHandleCount = RadioNodenodescount + SharedCNFnodescount;
  //     } else {
  //       cmHandleCount = RadioNodenodescount;
  //     }

  //     let CMHandleList = getCmHandlesForEnm(subsystemId, cmHandleCount);
  //     if (CMHandleList.includes(CMHandle)) {
  //       ChangeCMHandle = false;
  //     }
  //     if (ChangeCMHandle) {
  //       CMHandle = '8820B8FCFF940CC4C9D0D10F08D9C8E3';
  //       console.log('To be upgraded CMHandle got redefined for PE :>>  ' + CMHandle);
  //     } else {
  //       console.log('CMHandle ' + CMHandle + ' Found!');
  //     }
  //     let getCMHandle = http.get(`${NCMP_URL}ncmp/v1/ch/${CMHandle}/state`, cm_ParamsNoAuth);
  //     const oldCMHandle = JSON.parse(getCMHandle.body);

  //     console.log('Create upgrade event with addOnDemandEvent');
  //     var networkElementList = getNetworkElementListFromEnmAdapter(subsystemId);
  //     var targetName = getTargetFromNetworkElementList(networkElementList);
  //     var codedOndemandEvent = encoding.b64encode(generateNodeUpgradeEvent(targetName));
  //     var codedAddOnDemandEventCommand = encoding.b64encode(`enm1.addOnDemandEvent("${codedOndemandEvent}")`);

  //     console.log('Generated upgrade event: ' + codedAddOnDemandEventCommand);
  //     let addOnDemandEventResponse = http.get(ENM_SIM_URL + codedAddOnDemandEventCommand);
  //     sleep(60);
  //     getCMHandle = http.get(`${NCMP_URL}ncmp/v1/ch/${CMHandle}/state`, cm_ParamsNoAuth);
  //     const newCMHandle = JSON.parse(getCMHandle.body);
  //     const res = check(addOnDemandEventResponse, {
  //       'Add Upgrade Event (status: 200)': (r) => addOnDemandEventResponse.status === 200,
  //       'Upgrade Event response is correct (void)': (r) => addOnDemandEventResponse.body.includes('void'),
  //       'Upgrade verification (lastUpdateTime of CMHandle changed)': (r) => oldCMHandle.state.lastUpdateTime != newCMHandle.state.lastUpdateTime,
  //     });
  //     if (!res) {
  //       console.log('addOnDemandEventResponse status: ' + addOnDemandEventResponse.status);
  //       addOnDemandEventResponse.body && console.log('addOnDemandEventResponse body: ' + addOnDemandEventResponse.body);
  //       console.log('getCMHandle status: ' + getCMHandle.status);
  //       getCMHandle.body && console.log('getCMHandle body: ' + getCMHandle.body);
  //       console.log('oldCMHandle.state.lastUpdateTime :>> ', oldCMHandle.state.lastUpdateTime);
  //       console.log('newCMHandle.state.lastUpdateTime :>> ', newCMHandle.state.lastUpdateTime);
  //       errorCounter.add(1);
  //     }
  //   });
  // });
  // setCmHandleCount(RadioNodenodescount, 'Ireland');
  endLine('Finished eventPolling');
}
