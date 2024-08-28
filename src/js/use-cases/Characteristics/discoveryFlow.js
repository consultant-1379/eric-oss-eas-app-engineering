import {registerSubsystem, timeTaken} from "./charutils.js";
import {ENM_URL} from "../../utility/constants.js";
import {getCmHandlesForEnm} from "../../utility/utility.js";
import {customMetrics} from "../../characteristicsTests.js";
import {topologyDiscovery} from "../Non-Functional/CRUDOperations.js";
import { fail } from 'k6';

export function cmHandleDiscoveryChar(data) {
    let startTime = Date.now();
    let subsystemId = registerSubsystem('CharacteristicTestENM', ENM_URL, data.session);
    getCmHandlesForEnm(subsystemId, data.counts.cmHandlecounts, data.session.sessionHeader);
    customMetrics['cmHandleDiscoveryChar'].add(timeTaken(startTime));
}

export function gnbduTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('gnbdu', __ENV.topoTimeout, data.counts.gnbdu);
    customMetrics['gnbduTopologyDiscovery'].add(timeTaken(startTime));
}

export function gnbcucpTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('gnbcucp', __ENV.topoTimeout, data.counts.gnbcucp);
    customMetrics['gnbcucpTopologyDiscovery'].add(timeTaken(startTime));
}

export function gnbcuupTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('gnbcuup', __ENV.topoTimeout, data.counts.gnbcuup);
    customMetrics['gnbcuupTopologyDiscovery'].add(timeTaken(startTime));
}

export function nrcellTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('nrcell', __ENV.topoTimeout, data.counts.nrcell);
    customMetrics['nrcellTopologyDiscovery'].add(timeTaken(startTime));
}

export function nrsectorcarrierTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('nrsectorcarrier', __ENV.topoTimeout, data.counts.nrsectorcarrier);
    customMetrics['nrsectorcarrierTopologyDiscovery'].add(timeTaken(startTime));
}

export function enodebTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('enodeb', __ENV.topoTimeout, data.counts.enodeb);
    customMetrics['enodebTopologyDiscovery'].add(timeTaken(startTime));
}

export function ltecellTopologyDiscoveryChar(data) {
    let startTime = Date.now();
    if(__ENV.topoTimeout === undefined) fail();
    topologyDiscovery('ltecell', __ENV.topoTimeout, data.counts.ltecell);
    customMetrics['ltecellTopologyDiscovery'].add(timeTaken(startTime));
}