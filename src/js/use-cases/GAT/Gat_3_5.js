/*------------------------------------------------------------------------------
 *******************************************************************************
 * COPYRIGHT Ericsson 2021
 * The copyright to the computer program(s) herein is the property of
 * Ericsson Inc. The programs may be used and/or copied only with written
 * permission from Ericsson Inc. or in accordance with the terms and
 * conditions stipulated in the agreement/contract under which the
 * program(s) have been supplied.
 *******************************************************************************
 *----------------------------------------------------------------------------*/
import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorCounter } from '../../main.js';
import { datastore } from './Gat_3_2.js';
import { IAM_HOST, NCMP_URL, cm_ParamsNoAuth } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import { endLine } from '../../utility/utility.js';
import { singlePair5G } from './Gat_3_1.js';
import * as kafka from '../../utility/kafka.js';

export let options = {
  vus: 1,
  duration: '1s',
};

export default function (headSef) {
  const { cmHandleId, managedElementId } = singlePair5G;
  const cmHandle_hash = cmHandleId;
  console.log('Starting GAT 3.5');
  console.log('cmHandle_hash Gat3.5 :>> ', cmHandle_hash);
  console.log('managedElementId Gat3.5 :>> ', managedElementId);
  let managedelementid = 'NR01gNodeBRadioT00012';
  if (managedElementId.includes('adio')) {
    managedelementid = managedElementId;
  }
  console.log('managedElementId :>> ', managedElementId);
  console.log('managedelementid :>> ', managedelementid);

  describe('Gat 3.5: Managed Object query operations', function () {
    /* Using NCMP Rest API, verify GET request for GNBDUFunction */
    console.log('Step 1: Using NCMP Rest API, verify GET request for GNBDUFunction');
    describe('Verify GET request for GNBDUFunction', function () {
      const GET_GNBDUFunction_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`;
      console.log('GET_GNBDUFunction_URL: ', GET_GNBDUFunction_URL);

      let ncmpFlag = true,
        retries = 1,
        getGNBDUFunction;
      while (ncmpFlag && retries <= 5) {
        getGNBDUFunction = http.get(GET_GNBDUFunction_URL, headSef);
        if (getGNBDUFunction.status < 200 || getGNBDUFunction.status >= 300) {
          console.log('Error retrying request');
          console.log('Request Body: ' + getGNBDUFunction.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      } //

      const res = check(getGNBDUFunction, {
        'Get GNBDUFunction topology 200 OK': (r) => getGNBDUFunction.status === 200,
        'GNBDUFunction topology is returned successfully': (r) => getGNBDUFunction.body.match('ericsson-enm-gnbdu:GNBDUFunction'),
      });
      if (!res) {
        console.log('GNBDUFunction body: ' + getGNBDUFunction.body);
        console.log('GNBDUFunction status: ' + getGNBDUFunction.status);
        errorCounter.add(1);
      }
    });
    /* Using NCMP Rest API, verify GET request for brm 
  console.log('Step 2: Using NCMP Rest API, verify GET request for brm ');
describe('Verify GET request for brm', function () {
  const GET_BRM_URL = `${NCMP_URL}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=brm:brm=1`;
  console.log('GET_BRM_URL: ', GET_BRM_URL);

  let getbrm = http.get(GET_BRM_URL, cm_ParamsNoAuth);
  console.log(getbrm.body);
  console.log(getbrm.status);

  const getbrmResponse = check(getbrm, {
    'Get brm topology 200 OK': (r) => getbrm.status === 200,
    'brm is returned successfully': (r) => getbrm.body.match('brm:brm'),
  });
});*/

    /* Using NCMP Rest API, verify GET request for GNBDUFunction's NRCellDU attributes */
    console.log('Step 3: Using NCMP Rest API, verify GET request for GNBDUFunction with NRCellDU attributes field and scope filters');
    describe('Verify GET request for GNBDUFunction with NRCellDU attributes field and scope filters', function () {
      const GET_ATTRIBUTES_FILTERS_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}&options=${encodeURIComponent(`(fields=ericsson-enm-nrcelldu:NRCellDU/attributes(administrativeState;operationalState),scope=ericsson-enm-nrcelldu:NRCellDU/attributes(administrativeState=LOCKED))`)}`;
      console.log('GET_ATTRIBUTES_FILTERS_URL: ', GET_ATTRIBUTES_FILTERS_URL);

      let ncmpFlag = true,
        retries = 1,
        getManagedElement;
      while (ncmpFlag && retries <= 5) {
        getManagedElement = http.get(GET_ATTRIBUTES_FILTERS_URL, headSef);
        if (getManagedElement.status < 200 || getManagedElement.status >= 300) {
          console.log('Error retrying request');
          console.log('Request Body: ' + getManagedElement.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      } //
      console.log(getManagedElement.body);
      console.log(getManagedElement.status);
      let correct_response = {
        'ericsson-enm-gnbdu:GNBDUFunction': [
          {
            id: '1',
            'ericsson-enm-nrcelldu:NRCellDU': [
              { id: `${managedelementid}-3`, attributes: { administrativeState: 'LOCKED', operationalState: 'DISABLED' } },
              { id: `${managedelementid}-2`, attributes: { administrativeState: 'LOCKED', operationalState: 'DISABLED' } },
            ],
          },
        ],
      };

      const res = check(getManagedElement, {
        'Get ManagedElement with GNBDUFunction attributes field and scope filters from NCMP 200 OK': (r) => getManagedElement.status === 200,
        'ManagedElement with GNBDUFunction attributes field and scope filters is returned successfully': (r) => getManagedElement.body.match(correct_response),
      });
      if (!res) {
        console.log('getManagedElement body: ' + getManagedElement.body);
        console.log('getManagedElement status: ' + getManagedElement.status);
        errorCounter.add(1);
      }
      console.log('Reading events of GAT testcases');
      kafka.readEvents(60000, 2, 'enmadapter_cm_notification', false);
      endLine('Ending GAT');
    });
  });
}
