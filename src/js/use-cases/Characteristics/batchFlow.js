import { batchReadOperation, queryBatchResults } from './CRUDOperationsChar.js';
import { fail } from 'k6';

export function batchReadCRUDOperation(data) {
  if (__ENV.batchSize === undefined || __ENV.topicName === undefined) fail();
  let batchSize = parseInt(__ENV.batchSize);
  let topicName = __ENV.topicName;
  let nodes = data.nodes5g;
  batchReadOperation(data.session, nodes, batchSize, topicName, 'batchReadCRUDOperation');
}

export function queryBatchResultsTest() {
  if (__ENV.kafkaReadTime === undefined || __ENV.totalNumOfMessages === undefined || __ENV.topicName === undefined) fail();
  let totalNumOfMessages = parseInt(__ENV.totalNumOfMessages);
  let kafkaReadTime = parseInt(__ENV.kafkaReadTime);
  let topicName = __ENV.topicName;
  queryBatchResults(kafkaReadTime, totalNumOfMessages, topicName);
}

export function batchReadCRUDOperationRESTSim(data) {
  if (__ENV.batchSize === undefined || __ENV.topicName === undefined) fail();
  let batchSize = parseInt(__ENV.batchSize);
  let topicName = __ENV.topicName;
  let nodes = data.nodes5gRestsim1;
  batchReadOperation(data.session, nodes, batchSize, topicName, 'batchReadCRUDOperation');
}
