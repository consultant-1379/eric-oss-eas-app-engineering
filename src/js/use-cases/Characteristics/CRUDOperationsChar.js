import { encodedCredentials } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import * as kafka from '../../utility/kafka.js';
import { sendCommandsThroughNCMP } from './charutils.js';
import { startFrame, endLine } from '../../utility/utility.js';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const datastore = 'passthrough-running';
const kafkaPropagationTimeTrend = new Trend('kafka_propagation_time_in_seconds');
const timeBetweenFirstRequestandEvent = new Trend('time_between_first_request_and_event');
const good_statusCode_percentageTrend = new Trend('good_statusCode_percentage');
export function createOperation(session, managedElement, cmHandleHash, nRCellDU) {
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${nRCellDU}`,
        attributes: {
          typeISinglePanelRiRestriction: '15',
          ailgDlPrbLoadLevel: '0',
          drxOnDurationTimer: 'ONDURATIONTIMER_8MS',
          trsResourceShifting: 'DEACTIVATED',
          ulStartCrb: '0',
          endcDlNrQualHyst: '8',
          cellBarred: 'NOT_BARRED',
          drxInactivityTimer: 'INACTIVITYTIMER_8MS',
          cellReservedForOperator: 'NOT_RESERVED',
          ulRobustLaEnabled: 'false',
          nRCellDUId: `${nRCellDU}`,
          drxEnable: 'true',
          dlRobustLaEnabled: 'false',
          nrLteCoexistence: 'false',
          pZeroNomPuschGrant: '-100',
          endcUlNrLowQualThresh: '17',
          tddUlDlPattern: 'TDD_ULDL_PATTERN_00',
          rachPreambleTransMax: '10',
          pdschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          endcDlNrLowQualThresh: '-8',
          bfrEnabled: 'true',
          dlStartCrb: '0',
          csiReportFormat: 'CQI_WB_PMI_WB',
          rachPreambleRecTargetPower: '-110',
          trsPeriodicity: '20',
          csiRsShiftingSecondary: 'DEACTIVATED',
          ulMaxMuMimoLayers: '0',
          nRTAC: '999',
          ul256QamEnabled: 'false',
          dftSOfdmPuschEnabled: 'false',
          drxLongCycle: 'LONGCYCLE_80MS',
          dl256QamEnabled: 'true',
          endcUlNrQualHyst: '6',
          cellLocalId: '7125',
          ssbSubCarrierSpacing: '120',
          essMbsfnSubframeConfig: '9440512',
          ssbOffset: '0',
          administrativeState: 'LOCKED',
          ssbFrequency: '0',
          csiRsShiftingPrimary: 'DEACTIVATED',
          endcUlLegSwitchEnabled: 'false',
          siWindowLength: '20',
          pZeroNomPucch: '-114',
          nRPCI: '0',
          ailgModType: 'AILG_MOD_QPSK',
          dlMaxMuMimoLayers: '0',
          secondaryCellOnly: 'true',
          puschStartPrbStrategy: 'RANDOM_START_WITHIN_BAND',
          ssbDuration: '1',
          subCarrierSpacing: '120',
          userLabel: 'cmsync_abc',
          tddSpecialSlotPattern: 'TDD_SPECIAL_SLOT_PATTERN_00',
          trsPowerBoosting: '0',
          csiRsPeriodicity: '40',
          endcDlLegSwitchEnabled: 'true',
          qRxLevMin: '-140',
          pMax: '23',
          dftSOfdmMsg3Enabled: 'false',
          ssbPeriodicity: '20',
          ailgPdcchLoadLevel: '0',
          pZeroUePuschOffset256Qam: '0',
          ssbPowerBoost: '0',
          rachRootSequence: '1',
          pLMNIdList: '[{mcc=228, mnc=49}, {mcc=229, mnc=50}, {mcc=230, mnc=51}]',
          sNSSAIList: '[{sd=123, sst=123}]',
          sibType2: '{siPeriodicity=32, siBroadcastStatus=BROADCASTING}',
        },
      },
    ],
  });
  describe('CRUD : Create operations', function () {
    sendCommandsThroughNCMP(session, 'POST', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, null);
  });
}

export function updateOperation(session, cmHandleHash, nRCellDU) {
  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: nRCellDU,
        attributes: {
          pLMNIdList: '[{mcc=328, mnc=49}, {mcc=329, mnc=50}]',
          sNSSAIList: '[{sd=124, sst=124},{sd=125, sst=125}]',
          sibType2: '{siPeriodicity=16, siBroadcastStatus=BROADCASTING}',
        },
      },
    ],
  });
  describe('CRUD : Update operations', function () {
    sendCommandsThroughNCMP(session, 'PATCH', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, null);
  });
}

export function readOperation(session, cmHandleHash, requestType, managedElement, nrCellDu) {
  describe('CRUD : Read operations', function () {
    if (requestType === 'nrcell') {
      sendCommandsThroughNCMP(session, 'GET', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrCellDu}`)}`, null, null);
    } else if (requestType === 'dufunction') {
      sendCommandsThroughNCMP(session, 'GET', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`/`)}&options=${encodeURIComponent(`(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBDU:GNBDUFunction/attributes(gNBId;gNBIdLength;dUpLMNId;gNBDUId);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRSectorCarrier/attributes(txDirection;arfcnDL;arfcnUL;bSChannelBwDL;bSChannelBwUL;configuredMaxTxPower);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRCellDU/attributes(cellLocalId;nRTAC;nRPCI;nRSectorCarrierRef;pLMNIdList;administrativeState);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/attributes(default5qiTable);ericsson-enm-GNBDU:GNBDUFunction/ericsson-enm-GNBDU:DU5qiTable/ericsson-enm-GNBDU:DU5qi/attributes(profile5qi;priorityLevel;packetDelayBudget))`)}`, null, null);
    } else {
      console.log('Unknown read requestType');
    }
  });
}

export function deleteOperation(session, cmHandleHash, managedElement, nrCellDu) {
  describe('CRUD : Delete operations', function () {
    sendCommandsThroughNCMP(session, 'DELETE', `ncmp/v1/ch/${cmHandleHash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedElement}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${nrCellDu}`)}`, null, null);
  });
}

export function callSearches(session, requestBody, scenario) {
  describe(scenario, function () {
    const body = requestBody || {};
    const payload = JSON.stringify(body);
    sendCommandsThroughNCMP(session, 'POST', 'ncmp/v1/ch/searches', payload, scenario);
  });
}

export function callIdSearches(session, requestBody, scenario) {
  describe(scenario, function () {
    const body = requestBody || {};
    const payload = JSON.stringify(body);
    sendCommandsThroughNCMP(session, 'POST', 'ncmp/v1/ch/id-searches', payload, scenario);
  });
}

export function batchReadOperation(session, managedElements, batchSize, topicName, scenario) {
  let cmHandles = [];
  for (let i = 0; i < batchSize; i++) {
    let node = managedElements[Math.floor(Math.random() * managedElements.length)];
    let cmHandle = node.cmhandle;
    cmHandles.push(cmHandle);
  }
  let timeStamp = Date.now();
  const batchBody = JSON.stringify({
    operations: [
      {
        operationId: `batchOperationId-${__VU}-${__ITER}`,
        operation: 'read',
        datastore: 'ncmp-datastore:passthrough-operational',
        resourceIdentifier: '/',
        options: '(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-GNBDU:GNBDUFunction/attributes(*);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRSectorCarrier/attributes(txDirection;arfcnDL;arfcnUL;bSChannelBwDL;bSChannelBwUL;configuredMaxTxPower;frequencyDL;frequencyUL;sectorEquipmentFunctionRef);ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-GNBDU:NRCellDU/attributes(cellLocalId;nRTAC;nRPCI;pLMNIdList;administrativeState;nRSectorCarrierRef;nCI))',
        targetIds: cmHandles,
      },
    ],
  });
  describe('CRUD : Batch operations', function () {
    // console.log('BATCHBODY: ' + batchBody);
    sendCommandsThroughNCMP(session, 'POST', `ncmp/v1/data?topic=${topicName}`, batchBody, scenario);
  });
}

export function queryBatchResults(kafkaReadTime, totalNumOfMessages, topicName) {
  startFrame('Starting batch read characteristics test');
  describe('Batch read characteristics test', function () {
    const expectedNumberofEvents = 48000; // rate = 4, timeUnit = 1s, duration = 60s, batch_size = 200, 4*60*200=48000
    let batchCount = 0;
    let startTime = Date.now(),
      elapsedSeconds = 0;
    let response_KF_TOPIC = [];
    let decodedMessages;
    // while (batchCount < totalNumOfMessages) {
    try {
      decodedMessages = kafka.readEvents(kafkaReadTime, totalNumOfMessages, topicName, true);
      batchCount = decodedMessages.length;
      console.log('Processed events: ' + batchCount + ' in ' + (Date.now() - startTime) / 1000 + ' s');
    } catch (error) {
      console.log('Error occured during batch response query: ' + error);
    }
    // }
    elapsedSeconds = (Date.now() - startTime) / 1000;
    console.log('Total time taken for batch results: ' + elapsedSeconds + ' s');
    decodedMessages.forEach((m) => {
      response_KF_TOPIC = response_KF_TOPIC.concat(m);
    });
    console.log('response_KF_TOPIC.length :>> ', response_KF_TOPIC.length);
    console.log('response_KF_TOPIC[0] :>> ', response_KF_TOPIC[0]);
    console.log('response_KF_TOPIC[response_KF_TOPIC.length-1] :>> ', response_KF_TOPIC[response_KF_TOPIC.length - 1]);
    let statusCodeCounts = { 0: 0, 103: 0, 107: 0 };
    for (let i = 0; i < response_KF_TOPIC.length; i++) {
      const response = response_KF_TOPIC[i];
      const responseValue = JSON.parse(response.value);
      const statusCode = responseValue.data.responses[0].statusCode;
      statusCodeCounts[statusCode]++;
    }
    let totalCount = Object.values(statusCodeCounts).reduce((sum, count) => sum + count, 0);
    let maxPropagationTime = (totalCount * 60) / 10000;
    let correctCount = statusCodeCounts[0] || 0;

    let correctPercentage = (correctCount / expectedNumberofEvents) * 100;
    good_statusCode_percentageTrend.add(correctPercentage);
    console.log(`Correct statusCode percentage: ${correctPercentage.toFixed(2)}%`);

    let formattedCounts = Object.entries(statusCodeCounts)
      .map(([statusCode, count]) => `statusCode ${statusCode}: ${count}`)
      .join(', ');
    console.log('statusCode counts:', formattedCounts);
    const firstEventTime = response_KF_TOPIC[0].time;
    const lastEventTime = response_KF_TOPIC[response_KF_TOPIC.length - 1].time;
    const firstEventOffset = response_KF_TOPIC[0].offset;
    const lastEventOffset = response_KF_TOPIC[response_KF_TOPIC.length - 1].offset;
    const firstTimestamp = new Date(firstEventTime).getTime() / 1000;
    const lastTimestamp = new Date(lastEventTime).getTime() / 1000;
    const firstEventStartTimeInMs = new Date(firstEventTime).getTime() - startTime;
    const timeDifferenceInSeconds = Math.abs(lastTimestamp - firstTimestamp);
    kafkaPropagationTimeTrend.add(timeDifferenceInSeconds);
    timeBetweenFirstRequestandEvent.add(firstEventStartTimeInMs);

    // Eredmények kiíratása
    console.log('Time difference in seconds :>> ', timeDifferenceInSeconds);
    console.log('First event offset :>> ', firstEventOffset);
    console.log('Last event offset :>> ', lastEventOffset);
    console.log('The time between first request and event on kafka :>> ', firstEventStartTimeInMs, ' ms');

    const res = check(response_KF_TOPIC, {
      [`statusCode counts: (${formattedCounts})`]: formattedCounts === formattedCounts,
      [`Propagation time of the kafka events: ${timeDifferenceInSeconds} s, less than ${maxPropagationTime} s`]: timeDifferenceInSeconds <= maxPropagationTime,
      [`The time between first request and event on kafka is ${firstEventStartTimeInMs} ms`]: firstEventStartTimeInMs <= 8000,
    });
  });
  endLine('Finished batch read characteristics test');
}
