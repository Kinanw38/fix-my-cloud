// Expected failures and alternative valid fixes per level.
import { allLevels } from '../src/levels/index.js';

const byId = Object.fromEntries(allLevels.map((l) => [l.id, l]));
const fix = (id) => byId[id].fix;
const vuln = (id) => byId[id].vulnerableCode;

export const fixtures = {
  'p1-flip-the-switch': {
    expected: ['service-public'],
    alternatives: [
      vuln('p1-flip-the-switch').replace('true', 'False'),
      vuln('p1-flip-the-switch').replace('true', '"false"'),
      vuln('p1-flip-the-switch').replace('true', 'no # internal only'),
    ],
  },
  'p2-pin-the-version': {
    expected: ['unpinned-image'],
    alternatives: [
      vuln('p2-pin-the-version').replace('python:latest', 'python:3.12-slim'),
      vuln('p2-pin-the-version').replace('python:latest', 'python@sha256:' + 'a'.repeat(64)),
      vuln('p2-pin-the-version').replace('python:latest', 'python:3.11.9 # pinned'),
    ],
  },
  'inc-0001-open-to-the-world': {
    expected: ['ssh-open-world', 'db-open-world'],
    alternatives: [
      vuln('inc-0001-open-to-the-world').replaceAll('"0.0.0.0/0"', '"198.51.100.0/24"'),
      fix('inc-0001-open-to-the-world').replace('["203.0.113.0/24"]', '[ "203.0.113.0/24" ] # office'),
      [
        'resource "aws_security_group" "web" {',
        '  name = "web-server"',
        '  ingress {',
        '    from_port = 443',
        '    to_port = 443',
        '    protocol = "tcp"',
        '    cidr_blocks = ["0.0.0.0/0"]',
        '  }',
        '}',
      ].join('\n'),
    ],
  },
  'inc-0002-key-in-the-repo': {
    expected: ['hardcoded-credential'],
    alternatives: [
      [
        'import boto3',
        'import os',
        's3 = boto3.client("s3", aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"])',
      ].join('\n'),
      'import boto3\nsession = boto3.Session(profile_name="shop")\ns3 = session.client("s3")',
      fix('inc-0002-key-in-the-repo') + '\n# old key was FAKE_KEY_DO_NOT_USE_123',
    ],
  },
  'inc-0003-pr-title': {
    expected: ['untrusted-in-run', 'no-permissions'],
    alternatives: [
      fix('inc-0003-pr-title').replace('permissions:\n  contents: read', 'permissions: {}'),
      fix('inc-0003-pr-title').replace('permissions:\n  contents: read', 'permissions: read-all'),
      fix('inc-0003-pr-title').replace('run: echo "Validating: $PR_TITLE"', 'run: |\n          echo "Validating: $PR_TITLE"\n          echo done'),
    ],
  },
  'inc-0004-destroy': {
    expected: ['deletion-protection', 'backup-retention', 'final-snapshot', 'prevent-destroy'],
    alternatives: [
      fix('inc-0004-destroy').replace('= 7', '= 30'),
      fix('inc-0004-destroy').replace('orders-prod-final', 'orders-final-snap') + '\n# done',
      fix('inc-0004-destroy').replace('= true\n  }', '= true # keep\n  }'),
    ],
  },
  'inc-0005-metadata': {
    expected: ['imds-v1', 'wildcard-action', 'wildcard-resource'],
    alternatives: [
      fix('inc-0005-metadata').replace('"s3:GetObject"', '"s3:GetObject", "s3:ListBucket"').replace('/*"', '"'),
      fix('inc-0005-metadata').replace('\n    http_put_response_hop_limit = 1', ''),
      fix('inc-0005-metadata').replace('actions   = ["s3:GetObject"]', 'actions = [\n      "s3:GetObject",\n    ]'),
    ],
  },
  'inc-0006-label': {
    expected: ['deprecated-master-label', 'missing-control-plane-label'],
    alternatives: [
      fix('inc-0006-label').replace('node-role.kubernetes.io/control-plane', '"node-role.kubernetes.io/control-plane"'),
      fix('inc-0006-label').replace(
        '      nodeSelector:\n        node-role.kubernetes.io/control-plane: ""',
        [
          '      affinity:',
          '        nodeAffinity:',
          '          requiredDuringSchedulingIgnoredDuringExecution:',
          '            nodeSelectorTerms:',
          '              - matchExpressions:',
          '                  - key: node-role.kubernetes.io/control-plane',
          '                    operator: Exists',
        ].join('\n')
      ),
      fix('inc-0006-label') + '\n# was node-role.kubernetes.io/master',
    ],
  },
};
