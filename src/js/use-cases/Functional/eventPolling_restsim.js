import http from 'k6/http';
import { check, sleep, exec } from 'k6';
import encoding from 'k6/encoding';
import { errorCounter } from '../../main.js';
import { ENM_ADAPTER_URL, CM_HANDLE_FOR_EMPTYSTRING, NCMP_URL, RESTSIM_URL, TOPOLOGY_CORE_URL, countOfCmHandles, countOfRadioNodeCmHandles, countOfSharedCnfCmHandles, getCTS_Params } from '../../utility/constants.js';
import { discoverStatusCheck, getCmHandlesForEnm, getSubsystemId, startFrame, endLine, fancyTimeFormat, setCmHandleCount, sendCommand, statusCTSdiscovery, CTScleanupCheck, resetEvents } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import * as kafka from '../../utility/kafka.js';

const CM_EVENT_TIMEOUT = 300000; // 5 minutes in msec
const K6_CONSUMER_GROUP = 'k6-consumer-group';

const postENM_Params = {
  headers: {
    accept: 'application/json, text/plain, */*',
    'content-type': 'application/json',
  },
  timeout: '600s',
};

export function generateRestSimEvent(targetName, neType, operationType) {
  console.log(`Generating RestSIM ${operationType} event for ${targetName}... `);
  if (neType == 'RadioNode') {
    var eventBody = [
      {
        moClass: 'NRCellDU',
        moFDN: `SubNetwork=Europe,SubNetwork=Ireland,MeContext=${targetName},ManagedElement=1,GNBDUFunction=1,NRCellDU=${targetName}_99`,
        modelNamespace: 'GNBDU',
        modelVersion: '23.1.0',
        newAttributeValues: [
          {
            typeISinglePanelRiRestriction: '15',
          },
          {
            endcUlNrQualHyst: '6',
          },
          {
            cellLocalId: '7125',
          },
          {
            ailgDlPrbLoadLevel: '0',
          },
          {
            drxOnDurationTimer: 'ONDURATIONTIMER_8MS',
          },
          {
            ssbSubCarrierSpacing: '120',
          },
          {
            trsResourceShifting: 'DEACTIVATED',
          },
          {
            ulStartCrb: '0',
          },
          {
            endcDlNrQualHyst: '8',
          },
          {
            essMbsfnSubframeConfig: '9440512',
          },
          {
            ssbOffset: '0',
          },
          {
            cellBarred: 'NOT_BARRED',
          },
          {
            sNSSAIList: [
              {
                sd: '123',
                sst: '123',
              },
            ],
          },
          {
            administrativeState: 'LOCKED',
          },
          {
            ssbFrequency: '0',
          },
          {
            csiRsShiftingPrimary: 'DEACTIVATED',
          },
          {
            endcUlLegSwitchEnabled: 'false',
          },
          {
            drxInactivityTimer: 'INACTIVITYTIMER_8MS',
          },
          {
            siWindowLength: '20',
          },
          {
            pZeroNomPucch: '-114',
          },
          {
            cellReservedForOperator: 'NOT_RESERVED',
          },
          {
            ulRobustLaEnabled: 'false',
          },
          {
            nRPCI: '0',
          },
          {
            ailgModType: 'AILG_MOD_QPSK',
          },
          {
            nRCellDUId: `${targetName}_99`,
          },
          {
            drxEnable: 'true',
          },
          {
            dlMaxMuMimoLayers: '0',
          },
          {
            dlRobustLaEnabled: 'false',
          },
          {
            secondaryCellOnly: 'true',
          },
          {
            nrLteCoexistence: 'false',
          },
          {
            pZeroNomPuschGrant: '-100',
          },
          {
            pLMNIdList: [
              {
                mcc: '228',
                mnc: '49',
              },
              {
                mcc: '229',
                mnc: '50',
              },
              {
                mcc: '230',
                mnc: '51',
              },
            ],
          },
          {
            puschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          },
          {
            ssbDuration: '1',
          },
          {
            endcUlNrLowQualThresh: '17',
          },
          {
            subCarrierSpacing: '120',
          },
          {
            userLabel: 'cmsync_abc',
          },
          {
            tddSpecialSlotPattern: 'TDD_SPECIAL_SLOT_PATTERN_00',
          },
          {
            tddUlDlPattern: 'TDD_ULDL_PATTERN_00',
          },
          {
            rachPreambleTransMax: '10',
          },
          {
            pdschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          },
          {
            trsPowerBoosting: '0',
          },
          {
            endcDlNrLowQualThresh: '-8',
          },
          {
            csiRsPeriodicity: '40',
          },
          {
            endcDlLegSwitchEnabled: 'true',
          },
          {
            qRxLevMin: '-140',
          },
          {
            bfrEnabled: 'true',
          },
          {
            dlStartCrb: '0',
          },
          {
            pMax: '23',
          },
          {
            csiReportFormat: 'CQI_WB_PMI_WB',
          },
          {
            rachPreambleRecTargetPower: '-110',
          },
          {
            dftSOfdmMsg3Enabled: 'false',
          },
          {
            ssbPeriodicity: '20',
          },
          {
            ailgPdcchLoadLevel: '0',
          },
          {
            trsPeriodicity: '20',
          },
          {
            sibType2: '{siPeriodicity=32,siBroadcastStatus=BROADCASTING}',
          },
          {
            csiRsShiftingSecondary: 'DEACTIVATED',
          },
          {
            ulMaxMuMimoLayers: '0',
          },
          {
            pZeroUePuschOffset256Qam: '0',
          },
          {
            nRTAC: '999',
          },
          {
            ul256QamEnabled: 'false',
          },
          {
            dftSOfdmPuschEnabled: 'false',
          },
          {
            drxLongCycle: 'LONGCYCLE_80MS',
          },
          {
            ssbPowerBoost: '0',
          },
          {
            dl256QamEnabled: 'true',
          },
          {
            rachRootSequence: '1',
          },
        ],
        operationType: `${operationType}`,
        targetName: `${targetName}`,
      },
    ];
  } else {
    var eventBody = [
      {
        moClass: 'NRCellDU',
        moFDN: `MeContext=${targetName},ManagedElement=1,GNBDUFunction=60276,NRCellDU=1`,
        modelNamespace: 'GNBDU',
        modelVersion: '23.1.0',
        newAttributeValues: [
          {
            administrativeState: 'UNLOCKED',
          },
        ],
        operationType: `${operationType}`,
        targetName: `${targetName}`,
      },
    ];
  }
  return eventBody;
}

export function addRestsimEvent(event, headers) {
  describe('Send RestSIM Event Request ', function () {});
  console.log(`Sending request towards endpoint : admin/restsim/events/generate-events-json-manual`);
  let addEvent, responseBody;
  try {
    addEvent = http.post(RESTSIM_URL + '/admin/restsim/events/generate-events-json-manual', JSON.stringify(event), headers);
    responseBody = addEvent.body;
    console.log(`Status was ::> ${addEvent.status}`);
  } catch (error) {
    console.log(`Error while adding event : ${error}`);
  }
  const res = check(addEvent, {
    ['Generate manual events status was 201 ']: () => addEvent.status === 201,
  });
  if (!res) {
    errorCounter.add(1);
    console.log(`Error while adding event... Status was ::> ${addEvent.status}`);
    console.log(`${event}`);
  }
}

export function generateRestSimEventBatch(targets, operationType) {
  console.log(`Generating RestSIM ${operationType} events for targets: ${targets}... `);
  let batchEventsBody = [];
  for (let i = 0; i < targets.length; i++) {
    if (targets[i].includes('NodeBRadioT')) {
      var eventBody = {
        moClass: 'NRCellDU',
        moFDN: `SubNetwork=Europe,SubNetwork=Ireland,MeContext=${targets[i]},ManagedElement=${targets[i]},GNBDUFunction=1,NRCellDU=${targets[i]}_99`,
        modelNamespace: 'GNBDU',
        modelVersion: '23.1.0',
        newAttributeValues: [
          {
            typeISinglePanelRiRestriction: '15',
          },
          {
            endcUlNrQualHyst: '6',
          },
          {
            cellLocalId: '7125',
          },
          {
            ailgDlPrbLoadLevel: '0',
          },
          {
            drxOnDurationTimer: 'ONDURATIONTIMER_8MS',
          },
          {
            ssbSubCarrierSpacing: '120',
          },
          {
            trsResourceShifting: 'DEACTIVATED',
          },
          {
            ulStartCrb: '0',
          },
          {
            endcDlNrQualHyst: '8',
          },
          {
            essMbsfnSubframeConfig: '9440512',
          },
          {
            ssbOffset: '0',
          },
          {
            cellBarred: 'NOT_BARRED',
          },
          {
            sNSSAIList: [
              {
                sd: '123',
                sst: '123',
              },
            ],
          },
          {
            administrativeState: 'LOCKED',
          },
          {
            ssbFrequency: '0',
          },
          {
            csiRsShiftingPrimary: 'DEACTIVATED',
          },
          {
            endcUlLegSwitchEnabled: 'false',
          },
          {
            drxInactivityTimer: 'INACTIVITYTIMER_8MS',
          },
          {
            siWindowLength: '20',
          },
          {
            pZeroNomPucch: '-114',
          },
          {
            cellReservedForOperator: 'NOT_RESERVED',
          },
          {
            ulRobustLaEnabled: 'false',
          },
          {
            nRPCI: '0',
          },
          {
            ailgModType: 'AILG_MOD_QPSK',
          },
          {
            nRCellDUId: `${targets[i]}_99`,
          },
          {
            drxEnable: 'true',
          },
          {
            dlMaxMuMimoLayers: '0',
          },
          {
            dlRobustLaEnabled: 'false',
          },
          {
            secondaryCellOnly: 'true',
          },
          {
            nrLteCoexistence: 'false',
          },
          {
            pZeroNomPuschGrant: '-100',
          },
          {
            pLMNIdList: [
              {
                mcc: '228',
                mnc: '49',
              },
              {
                mcc: '229',
                mnc: '50',
              },
              {
                mcc: '230',
                mnc: '51',
              },
            ],
          },
          {
            puschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          },
          {
            ssbDuration: '1',
          },
          {
            endcUlNrLowQualThresh: '17',
          },
          {
            subCarrierSpacing: '120',
          },
          {
            userLabel: 'cmsync_abc',
          },
          {
            tddSpecialSlotPattern: 'TDD_SPECIAL_SLOT_PATTERN_00',
          },
          {
            tddUlDlPattern: 'TDD_ULDL_PATTERN_00',
          },
          {
            rachPreambleTransMax: '10',
          },
          {
            pdschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          },
          {
            trsPowerBoosting: '0',
          },
          {
            endcDlNrLowQualThresh: '-8',
          },
          {
            csiRsPeriodicity: '40',
          },
          {
            endcDlLegSwitchEnabled: 'true',
          },
          {
            qRxLevMin: '-140',
          },
          {
            bfrEnabled: 'true',
          },
          {
            dlStartCrb: '0',
          },
          {
            pMax: '23',
          },
          {
            csiReportFormat: 'CQI_WB_PMI_WB',
          },
          {
            rachPreambleRecTargetPower: '-110',
          },
          {
            dftSOfdmMsg3Enabled: 'false',
          },
          {
            ssbPeriodicity: '20',
          },
          {
            ailgPdcchLoadLevel: '0',
          },
          {
            trsPeriodicity: '20',
          },
          {
            sibType2: '{siPeriodicity=32,siBroadcastStatus=BROADCASTING}',
          },
          {
            csiRsShiftingSecondary: 'DEACTIVATED',
          },
          {
            ulMaxMuMimoLayers: '0',
          },
          {
            pZeroUePuschOffset256Qam: '0',
          },
          {
            nRTAC: '999',
          },
          {
            ul256QamEnabled: 'false',
          },
          {
            dftSOfdmPuschEnabled: 'false',
          },
          {
            drxLongCycle: 'LONGCYCLE_80MS',
          },
          {
            ssbPowerBoost: '0',
          },
          {
            dl256QamEnabled: 'true',
          },
          {
            rachRootSequence: '1',
          },
        ],
        operationType: `${operationType}`,
        targetName: `${targets[i]}`,
      };
    } else {
      var eventBody = {
        moClass: 'EUtranCellTDD',
        moFDN: `SubNetwork=Europe,SubNetwork=Ireland,SubNetwork=NETSimW,ManagedElement=${targets[i]},ENodeBFunction=1,EUtranCellTDD=${targets[i]}_99`,
        modelNamespace: '"Lrat"',
        modelVersion: '"3.80.0"',
        newAttributeValues: [
          {
            pdcchOuterLoopUpStepVolte: '6',
          },
          {
            skipUlPadPreschedEnabled: 'false',
          },
          {
            altitude: '707',
          },
          {
            administrativeState: 'LOCKED',
          },
          {
            cellLocalId: '7125',
          },
        ],
        operationType: 'CREATE',
        targetName: `${targets[i]}`,
      };
    }
    batchEventsBody = batchEventsBody.concat(eventBody);
    // console.log(batchEventsBody);
  }
  return batchEventsBody;
}

export function addRestSimBatchEvent(numberOfEvents, interval, iterations, events, headers) {
  let addBatchEvents;
  if (events === undefined) {
    addBatchEvents = http.post(RESTSIM_URL + '/admin/restsim/events/generate-events?events=' + numberOfEvents + '&interval=' + interval + '&iterations=' + iterations, JSON.stringify({}), headers);
  } else {
    addBatchEvents = http.post(RESTSIM_URL + '/admin/restsim/events/generate-events?events=' + numberOfEvents + '&interval=' + interval + '&iterations=' + iterations, JSON.stringify(events), headers);
  }
  console.log('Sending Batch of events to generate-events endpoint... ');
  console.log(`Number of events :>> ${numberOfEvents} over ${interval} seconds for ${iterations} iterations...`);
  const res = check(addBatchEvents, {
    ['Generate batch events status was: ' + addBatchEvents.status]: () => addBatchEvents.status === 201,
  });
  if (!res) {
    errorCounter.add(1);
    console.log(`Error while adding event... Status was ::> ${addBatchEvents.status}`);
    console.log(`${events}`);
  }
}

export function validateRestSimEvent(headers) {
  let getEvents = http.get(RESTSIM_URL + '/config-mgmt/event/events?orderBy=eventDetectionTimestamp%20desc', {}, headers);
  try {
    console.log(getEvents.body);
  } catch (error) {
    console.log(`Error while parsing RESTSIM CMEventsNBI response body ::> ${error}`);
  }
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
  }
  console.log('ENM Adapter response for network element list: ' + enmAdapterResponse.body);

  return enmAdapterResponse;
}

function getTargetFromNetworkElementList(enmAdapterResponse) {
  // Getting first element from the response
  var enmAdapterResponseJson = JSON.parse(enmAdapterResponse.body);
  var target;
  var targetList = [];
  for (let i = 0; i < enmAdapterResponseJson.NetworkElement.length; i++) {
    if (enmAdapterResponseJson.NetworkElement[i].attributes.softwareSyncStatus == 'TREAT_AS' || enmAdapterResponseJson.NetworkElement[i].attributes.softwareSyncStatus == 'AS_IS') {
      target = enmAdapterResponseJson.NetworkElement[i].id;
      targetList.push(target);
    }
  }
  console.log('Found NetworkElement with TREAT_AS or AS_IS SoftwareSync Status!');
  console.log(target);
  return { target, targetList };
}

export default function (subsystemId, data) {
  const head = {
    headers: {
      'Content-Type': `application/json`,
      Cookie: `iPlanetDirectoryPro=${data.authToken}`,
      'Accept-Encoding': 'gzip, deflate, sdch',
      Accept: 'application/vnd.com.ericsson.oss.scripting+text;VERSION="1"',
      'X-Requested-With': 'XMLHttpRequest',
    },
  };

  const RadioNodenodescount = data.radiocnt;
  const SharedCNFnodescount = data.sharedcnt;
  let headSef = data.headSef;

  startFrame('Starting eventPolling');
  console.log('Verify if Discovery is completed');

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
      getCmHandlesForEnm(subsystemId, cmHandleCount, headSef);
    } else {
      console.log('Discovery failed for subsystem: ' + subsystemId);
    }
  });

  console.log('Reset enmadapter_cm_notification kafka topic...');
  resetEvents('enmadapter_cm_notification', K6_CONSUMER_GROUP);

  console.log('EAS_TC_001a: Single event polling - RESTSIM event through generate-events-json-manual endpoint');
  describe('EAS_TC_001a: Single event polling - RESTSIM event through generate-events-json-manual endpoint', function () {
    var networkElementListRadio = getNetworkElementListFromEnmAdapter(subsystemId, 'RadioNode');
    var targetNameRadio = getTargetFromNetworkElementList(networkElementListRadio);
    var networkElementListShared = getNetworkElementListFromEnmAdapter(subsystemId, 'Shared-CNF');
    var targetNameShared = getTargetFromNetworkElementList(networkElementListShared);
    console.log('Single RadioNode Event generation...');
    describe('Single RadioNode Event generation', function () {
      let RestSIMEventRadioNode = generateRestSimEvent(targetNameRadio.target, 'RadioNode', 'CREATE');
      console.log('RestSIMEventRadioNode :>> ', RestSIMEventRadioNode);
      addRestsimEvent(RestSIMEventRadioNode, head);
      console.log(`Validate event through RestSIM CMEventNBI... `);
      validateRestSimEvent(head);

      // Read events from Kafka topic until all events are consumed and verify event count
      // This is required because Kafka topic http interface may or may not return all events at once
      console.log(`Validate event through enmadapter_cm_notifciation kafka topic... `);
      let startTime = Date.now();
      const messages = kafka.readEvents(60000, 1, 'enmadapter_cm_notification', false);
      let endTime = Date.now();
      let elapsedMilliseconds = startTime - endTime;
      console.log('Number of Events consumed from kafka: ' + messages.length);
      const res1 = check(messages, {
        ['Number of Events consumed from kafka is 1']: (r) => messages.length == 1,
        'Messages from kafka have been reached within 1 minute': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res1) {
        console.log('messages length: ' + messages.length);
        errorCounter.add(1);
      }
      console.log('Checking NRCell count after CREATE event in CTS....');
      let checkNrCellDUInCTS = http.get(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctw/nrcell?externalId=%25${targetNameRadio.target}_99%25`, getCTS_Params);
      const res = check(checkNrCellDUInCTS, {
        'NrCellDU has been added to Common Topology Service (status: 200)': () => checkNrCellDUInCTS.status === 200,
      });
      if (!res) {
        console.log('NrCellDU in CTS: ' + checkNrCellDUInCTS.body);
        console.log('NrCellDU in CTS: ' + checkNrCellDUInCTS.status);
        errorCounter.add(1);
      }

      console.log('Sending Delete event for the created cell...');
      RestSIMEventRadioNode = generateRestSimEvent(targetNameRadio.target, 'RadioNode', 'DELETE');
      console.log('RestSIMEventRadioNode :>> ', RestSIMEventRadioNode);
      addRestsimEvent(RestSIMEventRadioNode, head);
      console.log(`Validate event through RestSIM CMEventNBI... `);
      validateRestSimEvent(head);
      const messages1 = kafka.readEvents(60000, 1, 'enmadapter_cm_notification', false);
      const res2 = check(messages1, {
        ['Number of Events consumed from kafka is 1']: (r) => messages1.length == 1,
        'Messages from kafka have been reached within 1 minute': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res2) {
        console.log('messages length: ' + messages1.length);
        errorCounter.add(1);
      }
      console.log('Checking NRCell count after DELETE event in CTS....');
      let ctsCount,
        timeoutTime = 5,
        errcheck = true,
        ctsType = 'nrcell';
      if (SharedCNFnodescount == 100) {
        ctsCount = RadioNodenodescount * 2 + 270 + 1;
      } else {
        ctsCount = RadioNodenodescount * 2 + 1;
      }
      CTScleanupCheck(ctsType, timeoutTime, ctsCount, errcheck);
    });

    console.log('Single Shared-CNF Event generation...');
    describe('Single Shared-CNF Event generation', function () {
      let RestSIMEventSharedCNF = generateRestSimEvent(targetNameShared.target, 'Shared-CNF', 'CREATE');
      addRestsimEvent(RestSIMEventSharedCNF, head);
      console.log(`Validate event through RestSIM CMEventNBI... `);
      validateRestSimEvent(head);

      // Read events from Kafka topic until all events are consumed and verify event count
      // This is required because Kafka topic http interface may or may not return all events at once
      console.log(`Validate event through enmadapter_cm_notifciation kafka topic... `);
      let startTime = Date.now();
      const messages = kafka.readEvents(60000, 1, 'enmadapter_cm_notification', false);
      let endTime = Date.now();
      let elapsedMilliseconds = startTime - endTime;
      console.log('Number of Events consumed from kafka: ' + messages.length);
      const res3 = check(messages, {
        ['Number of Events consumed from kafka is 1']: (r) => messages.length == 1,
        'Messages from kafka have been reached within 1 minute': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
      });
      if (!res3) {
        console.log('messages length: ' + messages.length);
        errorCounter.add(1);
      }
    });
  });

  describe('EAS_TC_002: Batch event polling - RESTSIM RadioNode events through generate-events endpoint', function () {
    // // Optional parameters if the configured events shoud come from a registered subsystems networkElements
    //
    // var networkElementListRadio = getNetworkElementListFromEnmAdapter(subsystemId, 'RadioNode');
    // var targetNamesRadio = getTargetFromNetworkElementList(networkElementListRadio);
    // console.log(`Listing out RadioNode targets for Batch event creation...`);
    // console.log(targetNamesRadio.targetList);
    // let RestSIMBatchRadioNode = generateRestSimEventBatch(targetNamesRadio.targetList, 'UPDATE');
    //
    addRestSimBatchEvent(100, 60, 1, undefined, head);
    console.log(`Validate batch events through RestSIM CMEventNBI... `);
    validateRestSimEvent(head);
    console.log(`Validate events through enmadapter_cm_notifciation kafka topic... `);
    let startTime = Date.now();
    const messages = kafka.readEvents(120000, 100, 'enmadapter_cm_notification', false);
    let endTime = Date.now();
    let elapsedMilliseconds = startTime - endTime;
    console.log('Number of Events consumed from kafka: ' + messages.length);
    const res4 = check(messages, {
      [`Number of Events consumed from kafka is ${messages.length} and should be 100`]: (r) => messages.length == 100,
      'Messages from kafka have been reached within 5 minutes': (r) => elapsedMilliseconds <= CM_EVENT_TIMEOUT,
    });
    if (!res4) {
      console.log('messages length: ' + messages.length);
      errorCounter.add(1);
    }
  });
  endLine('Finished eventPolling');
}
