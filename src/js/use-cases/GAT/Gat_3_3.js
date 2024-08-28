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
import { IAM_HOST, NCMP_URL, TOPOLOGY_CORE_URL, cm_ParamsNoAuth, getCTS_Params } from '../../utility/constants.js';
import { describe } from '../../utility/describe.js';
import { singlePair5G } from './Gat_3_1.js';

export let options = {
  vus: 1,
  duration: '1s',
};

export default function (headSef) {
  console.log('Starting GAT 3.3');
  const { cmHandleId, managedElementId } = singlePair5G;
  const cmHandle_hash = cmHandleId;
  describe('Gat 3.3: Update an Object in ENM', function () {
    /* Testcase to get NRCellDU object data before update*/
    console.log('Get NRCellDU object data before update');
    console.log('cmHandle_hash Gat3.3 :>> ', cmHandle_hash);
    console.log('managedElementId Gat3.3 :>> ', managedElementId);
    const NCMP_GET_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${managedElementId}-99`)}`;
    console.log('NCMP_GET_URL: ', NCMP_GET_URL);

    let getObjectDataBeforeUpdate = http.get(NCMP_GET_URL, headSef);
    console.log(getObjectDataBeforeUpdate.body);
    console.log(getObjectDataBeforeUpdate.status);

    /* Testcase to update NRCellDU object via NCMP */
    console.log('Step 1: Update NrCellDU in NCMP');
    describe('Update NrCellDU in NCMP', function () {
      const NCMP_UPDATE_URL = `${IAM_HOST}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`;
      console.log('NCMP_UPDATE_URL: ', NCMP_UPDATE_URL);

      const patch_headers = {
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
      };
      const data = {
        NRCellDU: [
          {
            id: `${managedElementId}-99`,
            attributes: {
              pLMNIdList: '[{mcc=328, mnc=49}, {mcc=329, mnc=50}]',
              sNSSAIList: '[{sd=124, sst=124},{sd=125, sst=125}]',
              sibType2: '{siPeriodicity=16, siBroadcastStatus=BROADCASTING}',
            },
          },
        ],
      };

      let ncmpFlag = true,
        retries = 1,
        updateObjectData;
      while (ncmpFlag && retries <= 5) {
        updateObjectData = http.patch(NCMP_UPDATE_URL, JSON.stringify(data), headSef);
        if (updateObjectData.status < 200 || updateObjectData.status >= 300) {
          console.log('Error retrying request');
          console.log('Request Body: ' + updateObjectData.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      } //
      const res = check(updateObjectData, {
        'NrCellDU object is updated successfully via NCMP': (r) => updateObjectData.status === 200,
      });
      if (!res) {
        console.log('NRCellDU Update Object: ' + updateObjectData.body);
        console.log('NRCellDU Update Object status: ' + updateObjectData.status);
        errorCounter.add(1);
      }
    });

    /* Testcase to get updated NRCellDU object data */
    console.log('Step 2: Verify that NRCellDU has been updated in NCMP');
    describe('Verify NRCellDU has been updated in NCMP', function () {
      let ncmpFlag = true,
        retries = 1,
        getObjectDataAfterUpdate;
      while (ncmpFlag && retries <= 5) {
        getObjectDataAfterUpdate = http.get(NCMP_GET_URL, headSef);
        if (getObjectDataAfterUpdate.status < 200 || getObjectDataAfterUpdate.status >= 300) {
          console.log('Error retrying request');
          console.log('Request Body: ' + getObjectDataAfterUpdate.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      } //
      if (getObjectDataBeforeUpdate.body !== getObjectDataAfterUpdate.body) {
        const res = check(getObjectDataAfterUpdate, {
          'Get object data using valid NRCellDU Id 200 OK': (r) => getObjectDataAfterUpdate.status === 200,
          'Updated object data is returned pLMNIdList': (r) => getObjectDataAfterUpdate.body.match('[{mcc=328, mnc=49}, {mcc=329, mnc=50}]'),
          'Updated object data is returned sNSSAIList': (r) => getObjectDataAfterUpdate.body.match('[{sd=124, sst=124},{sd=125, sst=125}]'),
          //  Testcase unnecessary due to enmStub environment's stateless nature
          //'Updated object data is returned sibType2': (r) => getObjectDataAfterUpdate.body.match('{siPeriodicity=16, siBroadcastStatus=BROADCASTING}'),
        });
        if (!res) {
          console.log('NRCellDU object after update in NCMP: ' + getObjectDataAfterUpdate.body);
          console.log('NRCellDU object status after update in NCMP: ' + getObjectDataAfterUpdate.status);
          errorCounter.add(1);
        }
      }
    });
    /* Testcase to verify NrCellDU has been updated in the Common Topology Service*/
    console.log('Step 3: Verify that the NRCellDU has been updated in CTS');
    describe('Verify NRCellDU has been updated in CTS', function () {
      const CTS_GET_URL = `${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctw/nrcell?externalId=%25${managedElementId}-99%25`;
      console.log('CTS_GET_URL: ', CTS_GET_URL);

      let getObjectData = http.get(CTS_GET_URL, getCTS_Params);

      const res = check(getObjectData, {
        'NrCellDU has been updated in the Common Topology Service 200 OK': (r) => getObjectData.status === 200,
        //'Updated object data(pLMNIdList) is returned in the Common Topology Service': (r) => getObjectData.body.match('[{mcc=328, mnc=49}, {mcc=329, mnc=50}]'),
      });
      if (!res) {
        console.log('NRCellDU object after update in CTS: ' + getObjectData.body);
        console.log('NRCellDU object status after update in CTS: ' + getObjectData.status);
        errorCounter.add(1);
      }
    });
  });
}
