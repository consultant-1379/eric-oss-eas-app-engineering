import {CTScleanupCheck} from "../../utility/utility.js";
import {customMetrics} from "../../characteristicsTests.js";
import {deregisterSubsystem, timeTaken} from "./charutils.js";
import {ENM_URL} from "../../utility/constants.js";
import { fail } from 'k6';

export function cmHandleCleanup(data) {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    deregisterSubsystem(ENM_URL, data.session);
    customMetrics['cmHandleCleanup'].add(timeTaken(startTime));
}

export function gnbduCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('gnbdu', __ENV.cleanupTimeout, 0, true);
    customMetrics['gnbduTopologyDeregistration'].add(timeTaken(startTime));
}

export function gnbcucpCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('gnbcucp', __ENV.cleanupTimeout, 0, true);
    customMetrics['gnbcucpTopologyDeregistration'].add(timeTaken(startTime));
}

export function gnbcuupCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('gnbcuup', __ENV.cleanupTimeout, 0, true);
    customMetrics['gnbcucpTopologyDeregistration'].add(timeTaken(startTime));
}

export function nrcellCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('nrcell', __ENV.cleanupTimeout, 0, true);
    customMetrics['nrcellTopologyDeregistration'].add(timeTaken(startTime));
}

export function nrsectorcarrierCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('nrsectorcarrier', __ENV.cleanupTimeout, 0, true);
    customMetrics['nrsectorcarrierTopologyDeregistration'].add(timeTaken(startTime));
}

export function enodebCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('enodeb', __ENV.cleanupTimeout, 0, true);
    customMetrics['enodebTopologyDeregistration'].add(timeTaken(startTime));
}

export function ltecellCTSCleanup() {
    let startTime = Date.now();
    if(__ENV.cleanupTimeout === undefined) fail();
    CTScleanupCheck('ltecell', __ENV.cleanupTimeout, 0, true);
    customMetrics['ltecellTopologyDeregistration'].add(timeTaken(startTime));
}