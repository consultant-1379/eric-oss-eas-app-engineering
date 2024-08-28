import { check, sleep } from 'k6';
import http from 'k6/http';
import { IAM_HOST, NCMP_URL, TOPOLOGY_CORE_URL, TIEH_URL, getCTS_Params, cm_ParamsNoAuth } from '../../utility/constants.js';
import { errorCounter } from '../../main.js';
import { describe } from '../../utility/describe.js';
import { singlePair5G } from './Gat_3_1.js';

export const datastore = 'passthrough-running';
export const nrcellduid = 'NR45gNodeBRadio00022-99';

export default function (headSef) {
  console.log('Starting Gat 3.2');
  const { cmHandleId, managedElementId } = singlePair5G;
  console.log('cmHandleId 3.2:', cmHandleId);
  console.log('managedElementId 3.2:', managedElementId);

  let managedelementid = 'NR01gNodeBRadioT00012';
  if (managedElementId.includes('adio')) {
    managedelementid = managedElementId;
  }
  console.log('managedelementid :>> ', managedelementid);
  const postENM_Params = {
    headers: {
      accept: 'application/json, text/plain, */*',
      'content-type': 'application/json',
    },
  };
  describe('Gat 3.2: Create an Object in ENM', function () {
    console.log('Step 1: Creating an NrCellDU');
    console.log('cmHandleId 3.2_2:', cmHandleId);
    describe('Creating an NrCellDU', function () {
      const NrCellDUBody = JSON.stringify({
        NRCellDU: [
          {
            id: `${managedelementid}-99`,
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
      let ncmpFlag = true,
        retries = 1,
        createNrCellDU;
      while (ncmpFlag && retries <= 5) {
        createNrCellDU = http.post(`${IAM_HOST}ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1`)}`, NrCellDUBody, headSef);
        if (createNrCellDU.status < 200 || createNrCellDU.status >= 300) {
          console.log('Error retrying request');
          console.log('Request status: ' + createNrCellDU.status);
          console.log('Request Body: ' + createNrCellDU.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      }
      const res = check(createNrCellDU, {
        'NrCellDU created successfully (status: 201)': () => createNrCellDU.status === 201,
      });
      if (!res) {
        console.log('Creating an NrCellDU: ' + createNrCellDU.body);
        console.log('Creating an NrCellDU: ' + createNrCellDU.status);
        errorCounter.add(1);
      }
    });

    console.log('Step 2: Verify if the NrCellDU has been created');
    describe('Verify if the NrCellDU has been created', function () {
      let ncmpFlag = true,
        retries = 1,
        checkCreatedNrCellDU;
      while (ncmpFlag && retries <= 5) {
        checkCreatedNrCellDU = http.get(`${IAM_HOST}ncmp/v1/ch/${cmHandleId}/data/ds/ncmp-datastore:${datastore}?resourceIdentifier=${encodeURIComponent(`ericsson-enm-comtop:ManagedElement=${managedelementid}/ericsson-enm-gnbdu:GNBDUFunction=1/ericsson-enm-gnbdu:NRCellDU=${managedelementid}-99`)}`, headSef);
        if (checkCreatedNrCellDU.status < 200 || checkCreatedNrCellDU.status >= 300) {
          console.log('Error retrying request');
          console.log('Request Body: ' + checkCreatedNrCellDU.body);
          retries++;
          sleep(20);
        } else {
          ncmpFlag = false;
        }
      }
      const res = check(checkCreatedNrCellDU, {
        'NrCellDU has been created (status: 200)': () => checkCreatedNrCellDU.status === 200,
      });
      if (!res) {
        console.log('NrCellDU verification: ' + checkCreatedNrCellDU.body);
        console.log('NrCellDU verification: ' + checkCreatedNrCellDU.status);
        errorCounter.add(1);
      }
    });

    console.log('Step 3: Verification if NrCellDU is present in Common Topology Service');
    describe('Verification if NrCellDU is present in Common Topology Service', function () {
      let checkNrCellDUInCTS = http.get(`${TOPOLOGY_CORE_URL}oss-core-ws/rest/ctw/nrcell?externalId=%25${managedelementid}-99%25`, getCTS_Params);

      const res = check(checkNrCellDUInCTS, {
        'NrCellDU has been added to Common Topology Service (status: 200)': () => checkNrCellDUInCTS.status === 200,
      });
      if (!res) {
        console.log('NrCellDU in CTS: ' + checkNrCellDUInCTS.body);
        console.log('NrCellDU in CTS: ' + checkNrCellDUInCTS.status);
        errorCounter.add(1);
      }
    });
    // describe('Verification if NrCellDU is present in TIEH', function () {
    //   console.log('managedelementid: ' + managedelementid);
    //   let checkNrCellDUInTIEH = http.get(TIEH_URL + `topology-inventory/v1alpha10/domains/RAN/entities/NRCellDU?targetFilter=/attributes%28fdn%2CcmId%29&scopeFilter=/attributes%5Bcontains%28%40fdn%2C%22ManagedElement%3D${managedelementid}%22%29%5D`);
    //   let checkNrCellDUInTIEH2 = http.get(TIEH_URL + `topology-inventory/v1alpha10/domains/RAN/entities/NRCellDU?targetFilter=/attributes%28fdn%2CcmId%29&scopeFilter=/attributes%5Bcontains%28%40fdn%2C%22ManagedElement%3D${managedelementid}-99%22%29%5D`);

    //   console.log('NrCellDU in TIEH: ' + checkNrCellDUInTIEH.body);
    //   console.log('NrCellDU in TIEH: ' + checkNrCellDUInTIEH.status);
    //   console.log('NrCellDU2 in TIEH: ' + checkNrCellDUInTIEH2.body);
    //   console.log('NrCellDU2 in TIEH: ' + checkNrCellDUInTIEH2.status);
    //   const res = check(checkNrCellDUInTIEH, {
    //     'NrCellDU has been added to TIEH (status: 200)': () => checkNrCellDUInTIEH.status === 200,
    //     'NrCellDU has been added to TIEH (body is not empty)': () => checkNrCellDUInTIEH.body.length > 0,
    //   });
    //   if (!res) {
    //     console.log('NrCellDU in TIEH: ' + checkNrCellDUInTIEH.body);
    //     console.log('NrCellDU in TIEH: ' + checkNrCellDUInTIEH.status);
    //     errorCounter.add(1);
    //   }
    // });
  });
  console.log('Ending Gat 3.2');
}
