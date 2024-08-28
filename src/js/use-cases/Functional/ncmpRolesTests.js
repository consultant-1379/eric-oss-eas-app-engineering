import http from 'k6/http';
import { check } from 'k6';
import { IAM_HOST } from '../../utility/constants.js';
import { startFrame, endLine } from '../../utility/utility.js';
import { describe } from '../../utility/describe.js';
import { singlePair5G } from '../GAT/Gat_3_1.js';
import * as auth from '../../utility/auth.js';

export const datastore = 'passthrough-running';
export const nrcellduid = 'NR45gNodeBRadio00022-99';

export default function () {
  const { cmHandleId, managedElementId } = singlePair5G;

  let managedelementid = 'NR01gNodeBRadioT00012';

  if (managedElementId.includes('adio')) {
    managedelementid = managedElementId;
  }

  const NrCellDUBody = JSON.stringify({
    NRCellDU: [
      {
        id: `${managedelementid}-999`,
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
          nRCellDUId: `${managedelementid}-99`,
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
  const updateNrCellDUBody = {
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
  startFrame('Starting NCMP Role test: IDUN-111196');
  startFrame('NCMP ReadOnly Role test');
  describe('NCMP ReadOnly Role test', function () {
    let headSef = '',
      access_token = '',
      k6ClientId = '';
    ({ access_token, k6ClientId } = authorizeSEF('k6NcmpReadOnly', ['NetworkConfiguration_Application_ReadOnly']));
    headSef = {
      headers: {
        'content-type': `application/json`,
        Authorization: `Bearer ${access_token}`,
      },
    };
    let getAnchors = http.post(`${IAM_HOST}ncmp/v1/ch/id-searches`, '{}', headSef);
    const res = check(getAnchors, {
      'Positive ReadOnly test status is 200 (OK)': (r) => getAnchors.status === 200,
    });
    if (!res) {
      console.log('Positive ReadOnly status: ' + getAnchors.status);
      console.log('Positive ReadOnly body: ' + getAnchors.body);
    }
    let createNrCellDU = http.post(`${IAM_HOST}ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, headSef);
    const res1 = check(createNrCellDU, {
      'Negative ReadOnly test status is 403 (Forbidden)': (r) => createNrCellDU.status === 403,
    });
    if (!res1) {
      console.log('Negative ReadOnly status: ' + createNrCellDU.status);
      console.log('Negative ReadOnly body: ' + createNrCellDU.body);
    }
    console.log('Delete k6NcmpReadOnly client');
    let keycloakToken = auth.getKeycloakToken().json()['access_token'];
    const url = `${IAM_HOST}auth/admin/realms/master/clients/${k6ClientId}`;
    const headers = {
      Authorization: 'Bearer ' + keycloakToken,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Cookie: {},
    };
    let deleteClient = http.del(url, null, { headers });
    check(deleteClient, {
      'k6NcmpReadOnly client deleted successfully': deleteClient.status == 204,
    });
  });
  startFrame('NCMP ReadUpdate Role test');
  describe('NCMP ReadUpdate Role test', function () {
    let headSef = '',
      access_token = '',
      k6ClientId = '';
    ({ access_token, k6ClientId } = authorizeSEF('k6NcmpReadUpdate', ['NetworkConfiguration_Application_ReadUpdate']));
    headSef = {
      headers: {
        'content-type': `application/json`,
        Authorization: `Bearer ${access_token}`,
      },
    };

    let updateObjectData = http.patch(`${IAM_HOST}ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-gnbdu:GNBDUFunction=1`)}`, JSON.stringify(updateNrCellDUBody), headSef);
    const res = check(updateObjectData, {
      'Positive ReadUpdate test status is 200 (OK)': (r) => updateObjectData.status === 200,
    });
    if (!res) {
      console.log('Negative ReadUpdate status: ' + updateObjectData.status);
      console.log('Negative ReadUpdate body: ' + updateObjectData.body);
    }
    let createNrCellDU = http.post(`${IAM_HOST}ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, headSef);
    const res1 = check(createNrCellDU, {
      'Negative ReadUpdate test status is 403 (Forbidden)': (r) => createNrCellDU.status === 403,
    });
    if (!res1) {
      console.log('Negative ReadUpdate status: ' + createNrCellDU.status);
      console.log('Negative ReadUpdate body: ' + createNrCellDU.body);
    }
    console.log('Delete k6NcmpReadUpdate client');
    let keycloakToken = auth.getKeycloakToken().json()['access_token'];
    const url = `${IAM_HOST}auth/admin/realms/master/clients/${k6ClientId}`;
    const headers = {
      Authorization: 'Bearer ' + keycloakToken,
      'Content-Type': 'application/json',
      Accept: '*/*',
      Cookie: {},
    };
    let deleteClient = http.del(url, null, { headers });
    check(deleteClient, {
      'k6NcmpReadUpdate client deleted successfully': deleteClient.status == 204,
    });
  });
  endLine('Finished NCMP Role test');
}

export function authorizeSEF(clientId, roles) {
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
    const rolesWithIds = roles.map((role) => {
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
