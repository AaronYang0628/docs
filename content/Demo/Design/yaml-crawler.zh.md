+++
title = 'Yaml Crawler'
date = 2024-03-08T10:04:18+08:00
weight = 3
+++

### Steps
1. define which url you wanna crawl, lets say `https://www.xxx.com/aaa.apex`
2. create a page pojo to describe what kind of web page you need to process

Then you can create a yaml file named `root-pages.yaml` and its content is 
```yaml
- '@class': "org.example.business.hs.code.MainPage"
  url: "https://www.xxx.com/aaa.apex"
```
3. and then define a process flow yaml file, implying how to process web pages the crawler will meet.
```yaml
processorChain:
  - '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.ExceptionRecord"
    processor:
      '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.RetryControl"
      processor:
        '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.SpeedControl"
        processor:
          '@class': "org.example.business.hs.code.MainPageProcessor"
          application: "hs-code"
        time: 100
        unit: "MILLISECONDS"
      retryTimes: 1
  - '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.ExceptionRecord"
    processor:
      '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.RetryControl"
      processor:
        '@class': "net.zjvis.lab.nebula.crawler.core.processor.decorator.SpeedControl"
        processor:
          '@class': "net.zjvis.lab.nebula.crawler.core.processor.download.DownloadProcessor"
          pagePersist:
            '@class': "org.example.business.hs.code.persist.DownloadPageDatabasePersist"
            downloadPageRepositoryBeanName: "downloadPageRepository"
          downloadPageTransformer:
            '@class': "net.nebula.crawler.download.DefaultDownloadPageTransformer"
          skipExists:
            '@class': "net.nebula.crawler.download.SkipExistsById"
        time: 1
        unit: "SECONDS"
      retryTimes: 1
nThreads: 1
pollWaitingTime: 30
pollWaitingTimeUnit: "SECONDS"
waitFinishedTimeout: 180
waitFinishedTimeUnit: "SECONDS" 
```
`ExceptionRecord`, `RetryControl`, `SpeedControl` are provided by the yaml crawler itself, dont worry.
you only need to extend how to process your page `MainPage`, for example, you defined a `MainPageProcessor`.
each processor will produce a set of other page or `DownloadPage`. `DownloadPage` like a ship containing 
information you need, and this framework will help you process `DownloadPage` and download or persist.


4. Vola, run your crawler then.