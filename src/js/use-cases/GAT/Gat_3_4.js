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
import { check } from 'k6';
import { managedelementid, datastore } from './Gat_3_2.js';
import { NCMP_URL, TOPOLOGY_CORE_URL, cm_ParamsNoAuth, getCTS_Params } from '../../utility/constants.js';
import { cmHandle_hash } from './Gat_3_1.js';

export let options = {
  vus: 1,
  duration: '1s',
};

export default function () {
  /* Testcase to get NRCellDU object data*/
  console.log('Fetching data before DELETE action');

  const NCMP_GET_URL = `${NCMP_URL}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=NR45gNodeBRadio00022-99`;
  console.log('NCMP_GET_URL: ', NCMP_GET_URL);

  let getObjectDataBeforeUpdate = http.get(NCMP_GET_URL, cm_ParamsNoAuth);
  console.log(getObjectDataBeforeUpdate.body);
  console.log(getObjectDataBeforeUpdate.status);

  /* Testcase to DELETE NRCellDU object via NCMP */
  console.log('Step 1: Delete NRCellDU in NCMP');
  const NCMP_DELETE_URL = `${NCMP_URL}ncmp/v1/ch/${cmHandle_hash}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=NR45gNodeBRadio00022-99`;
  console.log('NCMP_DELETE_URL: ', NCMP_DELETE_URL);

  const delete_headers = {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
  };

  let deleteObject = http.del(NCMP_DELETE_URL, {}, delete_headers);
  console.log(deleteObject.body);
  console.log(deleteObject.status);

  const deleteObjectResponse = check(deleteObject, {
    'Delete Object status is 204': (r) => deleteObject.status === 204,
  });

  /* Testcase to get GNBDUFunction topology after DELETE*/
  console.log('Step 2: Using NCMP Rest API, verify the NrCellDU has been deleted by performing a GET request');

  console.log('NCMP_GET_URL: ', NCMP_GET_URL);

  let getGNBDUFunction = http.get(NCMP_GET_URL, cm_ParamsNoAuth);
  console.log(getGNBDUFunction.body);
  console.log(getGNBDUFunction.status);

  const getGNBDUFunctionResponse = check(getGNBDUFunction, {
    'Get GNBDUFunction topology 200 OK': (r) => getGNBDUFunction.status === 200,
    'NrCellDU is not not available in the response': (r) => JSON.parse(getGNBDUFunction.body)['ericsson-enm-gnbdu:NRCellDU'][0].id !== 'NR45gNodeBRadio00022-99',
  });

  /* Testcase to verify NrCellDU has been DELETED in the Common Topology Service*/
  console.log('Step 3: Verify that the NRCellDU has been deleted in CTS');

  const CTS_GET_URL = `${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctw/nrcell?externalId=%25NR45gNodeBRadio00022-99%25`;
  console.log('CTS_GET_URL: ', CTS_GET_URL);

  let getObjectData = http.get(CTS_GET_URL, getCTS_Params);
  console.log(getObjectData.body);
  console.log(getObjectData.status);
  const getObjectDataResponse = check(getObjectData, {
    'GET request for the resource types in the Common Topology Service 200 OK': (r) => getObjectData.status === 200,
    'NrCellDU is deleted successfully': (r) => !getObjectData.body.includes('NR45gNodeBRadio00022-99'),
  });
}
