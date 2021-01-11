---
layout:     post
title:      React Native之RNCWebView的白屏之旅
subtitle:   
date:       2019-12-26
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## 白屏出现
某日，测试同学和产品同学在回归版本功能的时候，突然发现在页面在返回时，Navigation的根视图突然白屏了，很是惊讶，也无法刷新使页面恢复，只能杀掉进程重新打开APP来解决。很快bug就来到了开发同学这里了<br>

## 白屏调试

#### 资源文件加载失败?
一开始调试时，发现在反复打开了3个不同的webview并关闭后，再次打开某一个特定的webview就会出现白屏，怀疑是`RNCWebView`组件使用的`WKWebView`进程崩溃(webViewWebContentProcessDidTerminate)引起的白屏，但打上断点调试了半天也没能复现(很是坑爹,饶了一个大圈子)，最后发现似乎是跟H5那边加载到的静态资源有点关系。在`didFinishNavigation`打上断掉，把html body输出出来看到了正常和非正常情况下的两个不同内容：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-165826.png" referrerpolicy="no-referrer">

<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-165914.png" referrerpolicy="no-referrer">
可以看到正常页面body内容是有layaContainer存在的canvas的，但白屏时body就只有index.js了，怀疑跟index.js加载失败或者是index.js里面加载的文件失败进而导致canvas丢失的问题；然后问题就交给了H5同学去处理了，最后过了不到20分钟，H5同学告知此页面资源文件由于是非HTTPS的，导致有时加载失败，改成HTTPS就好了，我试了一下也确实如此。吐了一口血....

#### react-native-screens回收了?
由于项目中使用了导航控制器，在RN中常见的导航控制器做法有两种，一种是依赖原生的UINavigationController提供的功能，而另外一种是`react-navigation`，其原理是通过router来管理导航状态，派发Action来获得新的State从而维护和管理导航状态。而为了节省内存项目中引入了`react-native-screens`，在导航push过多的时候会将前面的页面回收，页面返回时会将State恢复。但注释下来调试了也还是会出现白屏现象。

#### webview content高度变化了？
接着开始怀疑conteng 高度变化导致webview没有高度，从而看起来页面是白的，但调试下来并不是如此

#### 就是它[webViewWebContentProcessDidTerminate:]
最后，在连续打开了N多页面，并在页面中玩了N多游戏看了N多广告，终于进入断点了，果然就是它。

#### 解决问题
问题很好解决，在监听到WKWebView进程崩溃时，调用reload刷新页面即可
```javascript
const onContentProcessDidTerminate = useCallback(res => {
    if (isIOS) {
        if (webViewRef.current) {
            webViewRef.current.reload();
        }
        const { nativeEvent } = res;
        logger.warn('wkwebview进程崩溃', 'wkwebview:contentProcessTerminate', {
            url: nativeEvent.url,
            title: nativeEvent.title,
        });
    }
}, []);
```

## 线上跟踪
RN的代码通过CodePush发布到了生产环境，在跟踪白屏问题时，发现一天(相对)就有将近2万个白屏日志，
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-172922.png" referrerpolicy="no-referrer">
白屏的问题还是挺多的，难不成是js的内存泄露，或者是WKWebView的内存泄露造成的？

#### RNCWebView的循环引用
在`RNCWebView.m`的dealloc方法打上断点，然后navigation页面在back时，发现dealloc并没有执行，吃了一惊；难不成是使用的姿势不对？于是翻了一下源码发现了`WKWebViewConfiguration`，因为之前在做项目时发现`WKWebViewConfiguration`的`userContentController`在`addScriptMessageHandler`会对handler产生强引用产生循环引用导致内存无法释放，但看了一眼他的源码并无特殊处理，于是加了一个中间者来处理delegate，再次调试，dealloc方法执行了!!! 问题迎刃而解

#### github提交PR
问题验证通过，于是就给`react-native-webview`提交了一个PR<br>
[Fix iOS WKWebView retain cycle
](https://github.com/react-native-community/react-native-webview/pull/1096)<br>
目前已经合并到了8.0.2版本中，等版本发布后再持续跟踪一下白屏，看白屏现象是否能够降低


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
