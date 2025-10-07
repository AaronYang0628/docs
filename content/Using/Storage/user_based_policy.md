+++
title = 'User Based Policy'
date = 2024-03-14T15:00:59+08:00
+++

### User Based Policy
you can change `<$bucket>` to control the permission


{{< tabs title="App:" >}}
{{% tab title="minio" %}}
- `${aws:username}` is a build-in variable, indicating the logined user name.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowUserToSeeBucketListInTheConsole",
            "Action": [
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::*"
            ]
        },
        {
            "Sid": "AllowRootAndHomeListingOfCompanyBucket",
            "Action": [
                "s3:ListBucket"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::<$bucket>"
            ],
            "Condition": {
                "StringEquals": {
                    "s3:prefix": [
                        "",
                        "<$path>/",
                        "<$path>/${aws:username}"
                    ],
                    "s3:delimiter": [
                        "/"
                    ]
                }
            }
        },
        {
            "Sid": "AllowListingOfUserFolder",
            "Action": [
                "s3:ListBucket"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::<$bucket>"
            ],
            "Condition": {
                "StringLike": {
                    "s3:prefix": [
                        "<$path>/${aws:username}/*"
                    ]
                }
            }
        },
        {
            "Sid": "AllowAllS3ActionsInUserFolder",
            "Effect": "Allow",
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::<$bucket>/<$path>/${aws:username}/*"
            ]
        }
    ]
}
```
{{% /tab %}}
{{% tab title="oss" %}}
- `<$uid>` is Aliyun UID

```json
{
    "Version": "1",
    "Statement": [{
        "Effect": "Allow",
        "Action": [
            "oss:*"
        ],
        "Principal": [
            "<$uid>"
        ],
        "Resource": [
            "acs:oss:*:<$oss_id>:<$bucket>/<$path>/*"
        ]
    }, {
        "Effect": "Allow",
        "Action": [
            "oss:ListObjects",
            "oss:GetObject"
        ],
        "Principal": [
             "<$uid>"
        ],
        "Resource": [
            "acs:oss:*:<$oss_id>:<$bucket>"
        ],
        "Condition": {
            "StringLike": {
            "oss:Prefix": [
                    "<$path>/*"
                ]
            }
        }
    }]
}
```

###### Example:
```json
{
	"Version": "1",
	"Statement": [{
		"Effect": "Allow",
		"Action": [
			"oss:*"
		],
		"Principal": [
			"203415213249511533"
		],
		"Resource": [
			"acs:oss:*:1007296819402486:conti-csst/test/*"
		]
	}, {
		"Effect": "Allow",
		"Action": [
			"oss:ListObjects",
			"oss:GetObject"
		],
		"Principal": [
			"203415213249511533"
		],
		"Resource": [
			"acs:oss:*:1007296819402486:conti-csst"
		],
		"Condition": {
			"StringLike": {
				"oss:Prefix": [
					"test/*"
				]
			}
		}
	}]
}
```

{{% /tab %}}
{{< /tabs >}}

