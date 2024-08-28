#!/usr/bin/env groovy
/* IMPORTANT:
 *
 * In order to make this pipeline work, the following configuration on Jenkins is required:
 * - slave with a specific label (see pipeline.agent.label below)
 */

def defaultBobImage = 'armdocker.rnd.ericsson.se/proj-adp-cicd-drop/bob.2.0:1.7.0-55'
def ruleset = 'charts/ruleset2.0.yaml'
def bob = new BobCommand()
        .bobImage(defaultBobImage)
        .envVars([
            HOME:'${HOME}',
            ISO_VERSION:'${ISO_VERSION}',
            RELEASE:'${RELEASE}',
            SONAR_HOST_URL:'${SONAR_HOST_URL}',
            SONAR_AUTH_TOKEN:'${SONAR_AUTH_TOKEN}',
            GERRIT_CHANGE_NUMBER:'${GERRIT_CHANGE_NUMBER}',
            KUBECONFIG:'${KUBECONFIG_FILE}',
            NAMESPACE: '${NAMESPACE}',
            USER:'${USER}',
            SELI_ARTIFACTORY_REPO_USER:'${CREDENTIALS_SELI_ARTIFACTORY_USR}',
            SELI_ARTIFACTORY_REPO_PASS:'${CREDENTIALS_SELI_ARTIFACTORY_PSW}',
            SERO_ARTIFACTORY_REPO_USER:'${CREDENTIALS_SERO_ARTIFACTORY_USR}',
            SERO_ARTIFACTORY_REPO_PASS:'${CREDENTIALS_SERO_ARTIFACTORY_PSW}',
            MAVEN_CLI_OPTS: '${MAVEN_CLI_OPTS}',
            OPEN_API_SPEC_DIRECTORY: '${OPEN_API_SPEC_DIRECTORY}'
        ])
        .needDockerSocket(true)
        .toString()

pipeline {
    agent {
        label params.AGENT_LABEL
    }
    parameters {
        string(name: 'ARMDOCKER_USER_SECRET',
                defaultValue: 'ossapps100-user-creds',
                description: 'ARM Docker secret')
        string(name: 'NAMESPACE',
                defaultValue: 'easrash',
                description: 'Namespace to execute the test against' )
        string(name: 'KUBECONFIG_FILE',
                defaultValue: 'hall941_config',
                description: 'Kubernetes configuration file to specify which environment to install on' )
        string(name: 'AGENT_LABEL',
                defaultValue: 'evo_docker_engine',
                description: 'Label of agent which be used')
        booleanParam(name: 'TH_DISABLED',
                defaultValue: false,
                description: 'Tick it if there is no TH part in the deployment')
    }
    options { timestamps () }
    stages {
        stage('Prepare') {
            steps {
                sh "${bob} -r ${ruleset} test-rule"
                sh 'git clean -xdff'
                sh 'git submodule sync'
                sh 'git submodule update --init --recursive'
            }
        }
        stage('Checkout') {
            steps {
                checkout([$class: 'GitSCM', branches: [[name: '*/master']], extensions: [[$class: 'CleanBeforeCheckout']], userRemoteConfigs: [[credentialsId: 'eoadm100-user-creds', url: 'https://gerrit-gamma.gic.ericsson.se/OSS/com.ericsson.oss.appEngineering/eric-oss-eas-app-engineering']]])
                sh "chmod +x -R ${env.WORKSPACE}"
            }
        }
        stage('EAS K6 Test Deploy and Run') {
            steps {
                script {
                    withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                        sh "./eas-k6-functional/scripts/deployEASK6Pod.sh ${env.KUBECONFIG} ${env.NAMESPACE} "
                    }
                }
            }
        }
        stage('EAS Query result') {
            steps {
                script {
                    withCredentials( [file(credentialsId: params.KUBECONFIG_FILE, variable: 'KUBECONFIG')]) {
                        sh "install -m 600 ${KUBECONFIG} ./admin.conf"
                        sh "./eas-k6-functional/scripts/copyK6Report.sh ${env.KUBECONFIG} ${env.NAMESPACE} . eas"
                    }
                }
            }
        }
        stage('EAS Verify Results') {
            steps {
                sh "python3 -u ./eas-k6-functional/scripts/verifyResults.py \"eas-test-output.json\""
            }
            post {
                always {
                    sh "${bob} -r ${ruleset} k8s-logs || true"
                    archiveArtifacts "logs_${env.NAMESPACE}*"
                }
            }
        }
    }
    post {
        always {
            archiveArtifacts 'eas-test-output.json'
            archiveArtifacts 'eric-oss-eas-app-engineering.log'
            archiveArtifacts 'eas-result.html'
            publishHTML([allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: '',
                reportFiles: 'eas-result.html',
                reportName: 'Report',
                reportTitles: ''])
            cleanWs()
        }
    }
}

// More about @Builder: http://mrhaki.blogspot.com/2014/05/groovy-goodness-use-builder-ast.html
import groovy.transform.builder.Builder
import groovy.transform.builder.SimpleStrategy

@Builder(builderStrategy = SimpleStrategy, prefix = '')
class BobCommand {
    def bobImage = 'bob.2.0:latest'
    def envVars = [:]
    def needDockerSocket = false

    String toString() {
        def env = envVars
                .collect({ entry -> "-e ${entry.key}=\"${entry.value}\"" })
                .join(' ')

        def cmd = """\
            |docker run
            |--init
            |--rm
            |--workdir \${PWD}
            |--user \$(id -u):\$(id -g)
            |-v \${PWD}:\${PWD}
            |-v \${HOME}:\${HOME}
            |${needDockerSocket ? '-v /var/run/docker.sock:/var/run/docker.sock' : ''}
            |${env}
            |\$(for group in \$(id -G); do printf ' --group-add %s' "\$group"; done)
            |--group-add \$(stat -c '%g' /var/run/docker.sock)
            |${bobImage}
            |"""
        return cmd
                .stripMargin()           // remove indentation
                .replace('\n', ' ')      // join lines
                .replaceAll(/[ ]+/, ' ') // replace multiple spaces by one
    }
}
