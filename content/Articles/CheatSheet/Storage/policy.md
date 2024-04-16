+++
title = 'Policy'
date = 2024-03-14T15:00:59+08:00
+++

### S3
{{< tabs title="Schema:" >}}
{{% tab title="s3" %}}
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
                "arn:aws:s3:::csst"
            ],
            "Condition": {
                "StringEquals": {
                    "s3:prefix": [
                        "",
                        "user-data/",
                        "user-data/${aws:username}"
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
                "arn:aws:s3:::csst"
            ],
            "Condition": {
                "StringLike": {
                    "s3:prefix": [
                        "user-data/${aws:username}/*"
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
                "arn:aws:s3:::csst/user-data/${aws:username}/*"
            ]
        }
    ]
}
```
{{% /tab %}}
{{% tab title="oss" %}}
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

