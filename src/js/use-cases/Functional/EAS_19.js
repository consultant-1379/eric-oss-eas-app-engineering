import http from 'k6/http';
import { check, sleep } from 'k6';
import { describe } from '../../utility/describe.js';
import { IAM_HOST, NCMP_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { resetEvents, startFrame, endLine } from '../../utility/utility.js';
import { errorCounter } from '../../main.js';
import * as kafka from '../../utility/kafka.js';

const K6_CONSUMER_GROUP = 'k6-batch-group';
const K6_CONSUMER_ID = 'k6-batch-eas19-cgi-1';
const KF_TOPIC = 'k6-eas19';
const ASYNC_TOPIC = 'ncmp-async-m2m';
var response_KF_TOPIC = [];
var response_ASYNC_TOPIC = [];
var formattedCounts;
var formattedCounts2;
var messageCounter;
var eventcounter2;
export default function (data, headSef) {
  startFrame('Starting EAS_TC_019: IDUN-57512, ENM CM Adapter, NCMP batch endpoint test');
  describe('EAS_19_1: ENM CM Adapter, Topic k6-eas19, NCMP batch endpoint test', function () {
    console.log('Executing EAS_19_1');
    const cmHandleList_1 = [data.nodes5g[0].cmhandle];
    const cmHandleList_2 = data.nodes5g.slice(1, 5).map((node) => node.cmhandle);
    const cmHandleList_3 = [data.nodes5g[1].cmhandle];
    const cmHandleList_4 = data.nodes4g.slice(0, 2).map((node) => node.cmhandle);
    console.log('cmHandleList_1 :>> ', cmHandleList_1);
    console.log('cmHandleList_2 :>> ', cmHandleList_2);
    console.log('cmHandleList_3 :>> ', cmHandleList_3);
    console.log('cmHandleList_4 :>> ', cmHandleList_4);
    const batch_payload = {
      operations: [
        {
          operation: 'read',
          operationId: '1',
          resourceIdentifier: '/',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '(fields=ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-nrcelldu:NRCellDU/attributes(_attributePrefix:administrativeState;operationalState))',
          targetIds: cmHandleList_1,
        },
        {
          operation: 'read',
          operationId: '2',
          resourceIdentifier: '/',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '(fields=ericsson-enm-gnbdu:GNBDUFunction/ericsson-enm-nrcelldu:NRCellDU/attributes(_attributePrefix:administrativeState;operationalState))',
          targetIds: cmHandleList_2,
        },
        {
          operation: 'read',
          operationId: '3',
          resourceIdentifier: 'ericsson-enm-gnbdu:GNBDUFunction=1',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '',
          targetIds: cmHandleList_2,
        },
        {
          operation: 'read',
          operationId: '4',
          resourceIdentifier: '/',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '',
          targetIds: cmHandleList_3,
        },
        {
          operation: 'read',
          operationId: '5',
          resourceIdentifier: '/',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '(fields=ericsson-enm-ComTop:ManagedElement/attributes(dnPrefix);ericsson-enm-Lrat:ENodeBFunction/attributes(eNodeBPlmnId);ericsson-enm-Lrat:EUtranCellFDD/attributes(cellId;earfcndl;earfcnul);ericsson-enm-Lrat:EUtranCellTDD/attributes(cellId;earfcn))',
          targetIds: cmHandleList_4,
        },
        {
          operation: 'read',
          operationId: '6',
          resourceIdentifier: 'NetworkElement=CORE12EPGSSR_not_found',
          datastore: 'ncmp-datastore:passthrough-operational',
          options: '',
          targetIds: cmHandleList_1,
        },
      ],
    };
    let retryCount = 0;
    const maxRetries = 5;
    let TC19_1;

    // Retry loop for POST request and checking event responses
    resetEvents(ASYNC_TOPIC, K6_CONSUMER_GROUP);
    resetEvents(KF_TOPIC, K6_CONSUMER_GROUP);

    while (retryCount < maxRetries) {
      TC19_1 = http.post(IAM_HOST + 'ncmp/v1/data?topic=' + `${KF_TOPIC}`, JSON.stringify(batch_payload), headSef);
      console.log('TC19_1.body :>> ', TC19_1.body);
      sleep(5);
      messageCounter = 0;
      response_KF_TOPIC = [];

      let messages = kafka.readEvents(60000, 13, KF_TOPIC, false);
      messageCounter = messages.length;
      console.log('Number of events in DMM kafka :>> ' + messageCounter);

      messages.forEach((m) => {
        response_KF_TOPIC = response_KF_TOPIC.concat(m);
      });

      let statusCodeCounts = { 0: 0, 103: 0, 107: 0 };
      for (let i = 0; i < response_KF_TOPIC.length; i++) {
        const response = response_KF_TOPIC[i];
        const responseValue = JSON.parse(response.value);
        const statusCode = responseValue.data.responses[0].statusCode;
        statusCodeCounts[statusCode]++;
      }
      formattedCounts = Object.entries(statusCodeCounts)
        .map(([statusCode, count]) => `statusCode ${statusCode}: ${count}`)
        .join(', ');
      console.log('statusCode counts:', formattedCounts);

      if (statusCodeCounts[107] === 0) {
        console.log('No 107 status code found in event responses, continuing...');
        break;
      } else {
        if (retryCount >= maxRetries) {
          console.log('Maximum retries reached, exiting...');
          break;
        }
        retryCount++;
        console.log(`Retrying (${retryCount}/${maxRetries}) due to 107 status code in event responses...`);
      }
    }
    // Checkpoint: messageCounter is greater than 5
    const res1 = check(messageCounter, {
      'messageCounter > 5': messageCounter > 5,
    });
    if (!res1) {
      errorCounter.add(1);
    }

    // Checkpoint: All operationIds from 1 to 6 are present in the response_KF_TOPIC
    const expectedOperationIds = ['1', '2', '3', '4', '5', '6'];
    const operationIdsInResponse = response_KF_TOPIC.map((response) => {
      const responseValue = JSON.parse(response.value);
      const responseData = responseValue.data.responses;
      return responseData.map((entry) => entry.operationId);
    });
    const flattenedOperationIds = operationIdsInResponse.flat();
    const missingOperationIds = expectedOperationIds.filter((operationId) => !flattenedOperationIds.includes(operationId));

    if (missingOperationIds.length === 0) {
      console.log('All operationIds present.');
    } else {
      console.log('Missing operationIds:', missingOperationIds.join(', '));
    }
    const res2 = check(missingOperationIds.length === 0, {
      [`Missing operation Ids: (${missingOperationIds.join(', ')})`]: missingOperationIds.length === 0,
    });

    if (!res2) {
      errorCounter.add(1);
    }
    // Checkpoint: Validate response data
    for (let i = 0; i < response_KF_TOPIC.length; i++) {
      const response = response_KF_TOPIC[i];
      const responseValue = JSON.parse(response.value);

      const operationId = responseValue.data.responses[0].operationId;
      const statusCode = responseValue.data.responses[0].statusCode;

      const checkDescriptions = {
        1: 'resourceIdentifier empty, options not empty, 1 cmHandle (5G)',
        2: 'resourceIdentifier empty, options not empty, 4 cmHandles (5G)',
        3: 'resourceIdentifier not empty, options empty, 4 cmHandles (5G)',
        4: 'resourceIdentifier empty, options empty, 1 cmHandle (5G)',
        5: 'resourceIdentifier empty, options not empty, 2 cmHandles (4G)',
        6: 'resourceIdentifier bad, options empty, 1 cmHandle (5G)',
      };

      const checkParams = {
        [`Response status: ${statusCode} for operationId ${operationId} (${checkDescriptions[operationId]})`]: (res) => {
          if (['1', '2', '4', '5'].includes(operationId)) {
            return statusCode === '0';
          } else if (operationId === '3') {
            return statusCode === '0' || statusCode === '103';
          } else if (operationId === '6') {
            return statusCode === '103';
          }
          return false;
        },
      };

      const res3 = check(response, checkParams);
      if (!res3) {
        errorCounter.add(1);
      }
    }
  });
  describe('EAS_19_2: ENM CM Adapter, Topic ncmp-async-m2m, NCMP batch endpoint test', function () {
    console.log('Executing EAS_19_2');
    let TC19_2 = kafka.readEvents(60000, 13, ASYNC_TOPIC, false);
    TC19_2.forEach((m) => {
      response_ASYNC_TOPIC = response_ASYNC_TOPIC.concat(m);
    });
    //response_ASYNC_TOPIC = JSON.parse(TC19_2.body);
    eventcounter2 = response_ASYNC_TOPIC.length;
    let statusCodeCounts2 = { 0: 0, 103: 0, 107: 0 };
    for (let i = 0; i < response_ASYNC_TOPIC.length; i++) {
      const response2 = response_ASYNC_TOPIC[i];
      const response2Value = JSON.parse(response2.value);
      const statusCode2 = response2Value.data.responses[0].statusCode;
      statusCodeCounts2[statusCode2]++;
    }
    formattedCounts2 = Object.entries(statusCodeCounts2)
      .map(([statusCode2, count2]) => `statusCode ${statusCode2}: ${count2}`)
      .join(', ');
    console.log('statusCode counts:', formattedCounts);
    console.log('statusCode2 counts:', formattedCounts2);
    console.log('Number of events :>> ', messageCounter);
    console.log('Number of events2 :>> ', eventcounter2);

    const response_KF_TOPIC_sorted = response_KF_TOPIC.sort();
    const response_ASYNC_TOPIC_sorted = response_ASYNC_TOPIC.sort();
    console.log('response_ASYNC_TOPIC_sorted :>> ', response_ASYNC_TOPIC_sorted);
    console.log('response_KF_TOPIC_sorted :>> ', response_KF_TOPIC_sorted);
    const res4 = check(formattedCounts === formattedCounts2, {
      [`Status of events on ${KF_TOPIC} topic: ${formattedCounts}, status of events on ${ASYNC_TOPIC} topic: ${formattedCounts2} `]: formattedCounts === formattedCounts2,
      [`Count of events on ${KF_TOPIC} topic: ${messageCounter}, count of events on ${ASYNC_TOPIC} topic: ${eventcounter2} `]: messageCounter === eventcounter2,
    });

    if (!res4) {
      errorCounter.add(1);
    }
  });
  endLine('Finished EAS_TC_019');
}
