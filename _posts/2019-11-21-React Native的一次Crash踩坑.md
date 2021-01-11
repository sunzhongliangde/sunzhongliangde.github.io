---
layout:     post
title:      React Native的一次Crash踩坑
subtitle:   
date:       2019-11-21
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## 发现问题
某日，APP监控平台突然显示每日有大量Crash，崩溃率达到了1%多，已经影响到了2000多个用户了，都集中在iOS13系统下，iPhone6/6s/7/7Plus上，查看调用堆栈：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-152225.png" referrerpolicy="no-referrer">
大量的错误信息指向了这里`-[RCTWeakProxy displayDidRefresh:]: unrecognized selector sent to instance`<br>
查看`RCTWeakProxy`源码显示，`RCTWeakProxy`是一个消息转发中间者，目的是为了处理循环引用导致的内存不释放，将`SEL`转发到消息接收者身上<br>
而持有`RCTWeakProxy`的是`RCTUIImageViewAnimated`，其源码如下：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-152908.png" referrerpolicy="no-referrer">
>   RCTUIImageViewAnimated是一个用来处理gif图片解码的view；
>   CADisplayLink会对target产生强引用，为了处理循环引用，常见的做法是是采用一个中间者将消息再转发回来，这里处理的也没有异议。

<br>
而crash调用堆栈显示`RCTWeakProxy`不能响应`displayDidRefresh:`方法<br>
也就是说`RCTWeakProxy`没有将方法转发出去，自己来实现这个方法了，所以就报错了`unrecognized selector sent to instance`<br>
到了这里就百思不得其解了，画个图来表示一下引用关系:
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-154834.png" referrerpolicy="no-referrer">
也就是说`RCTWeakProxy`弱引用了`RCTUIImageViewAnimated`，一旦RCTUIImageViewAnimated释放了,RCTWeakProxy自然也就释放了，可为什么堆栈信息还会指向这里呢？网上搜索也没有找到响应的问题，RN的github上也没有相应的issues，难不成是自己使用的姿势有问题？<br>

## 解决问题
找了半天原因，似乎是跟异步线程释放了`RCTUIImageViewAnimated`有关，而线上崩溃率一直居高不下，为了尽快平复crash率，先暂时把这个crash压下来，这里利用了runtime的消息转发，在最后一步方法签名这一阶段捕捉到未响应的方法，然后将SEL转发到一个空方法上去实现
```objc
@implementation RCTWeakProxyCrashProtect

- (void)CrashProtectCollectCrashMessages {
    
}

@end

@implementation RCTWeakProxy (SafeSelector)

- (void)forwardInvocation:(NSInvocation *)anInvocation {
    anInvocation.selector = @selector(CrashProtectCollectCrashMessages);
    [anInvocation invokeWithTarget:[[RCTWeakProxyCrashProtect alloc] init]];
    
    // 在这里记录日志，因为CADisPlayLink每秒会大量调用，为了避免把日志系统压垮，这里使用了整个APP生命周期内只记录一次的做法
    static dispatch_once_t oncet;
    dispatch_once(&oncet, ^{
        // 日志
    });
}

- (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector {
    NSMethodSignature *signature = [RCTWeakProxyCrashProtect instanceMethodSignatureForSelector:@selector(CrashProtectCollectCrashMessages)];
    return signature;
}
```

## 疑问？
对于一个大厂写的代码，RCTWeakProxy为何要继承NSObject，而不是继承NSProxy呢？<br>
NSProxy相比NSObject来说在转发消息上面更有优势，效率也更加高效~~~~
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_WX20191228-162911.png" referrerpolicy="no-referrer">


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
