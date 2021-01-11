---
layout:     post
title:      iOS中的RunLoop
subtitle:   
date:       2019-08-29
author:     sunzhongliang
header-img: img/post-bg-2015.jpg
catalog: true
tags:
    - OC
---


## 什么是RunLoop
`RunLoop`，字面理解意思是运行循环，在程序运行的时候循环做一些事情；在程序当中主要应用于定时器、PerformSelector、GCD Async Main Queue
、事件响应、界面刷新、AutoreleasePool等等<br>
在iOS当中有两套API用来使用RunLoop<br>

- `Foundation`框架中的NSRunLoop
- `CoreFoundation`框架中的CFRunLoopRef

`NSRunLoop`是基于`CFRunLoopRef`的一层OC包装；CFRunLoopRef是开源的<br>
地址：https://opensource.apple.com/tarballs/CF/

### RunLoop与线程之间的关系
- 每条线程都有唯一的一个与之对应的RunLoop对象
- RunLoop保存在一个全局的Dictionary里，线程作为key，RunLoop作为value
- 线程刚创建时并没有RunLoop对象，RunLoop会在第一次获取它时创建
- RunLoop会在线程结束时销毁；线程没了，那么RunLoop也就没了
- 主线程的RunLoop已经自动获取（创建），子线程默认没有开启RunLoop(敲重点！！！)

### RunLoop相关的类
`CoreFoundation`中关于`RunLoop`的5个类
- CFRunLoopRef
- CFRunLoopModeRef
- CFRunLoopSourceRef
- CFRunLoopTimerRef
- CFRunLoopObserverRef

CFRunLoopRef源码中的定义
<img src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190829113617.jpg" referrerpolicy="no-referrer">

`Mode`表示模式<br>
`Timer`表示定时器；主要处理NSTimer、performSelector:withObject:afterDelay:<br>
`Observer`表示监听器；主要处理UI刷新、监听RunLoop的状态、AutoreleasePool等<br>
`Source0`表示要处理的事情；比如触摸事件、performSelector:onThread:<br>
`Source1`表示要处理的事情；比如基于Port的线程间的通信，系统事件捕捉

### CFRunLoopModeRef
`CFRunLoopModeRef`代表RunLoop的运行模式，常用的2种模式：<br>
 - `kCFRunLoopDefaultMode`（`NSDefaultRunLoopMode`）：`默认模式`，通常主线程是在这个Mode下运行
 - `UITrackingRunLoopMode`：`滚动模式`，用于 ScrollView 追踪触摸滑动，保证界面滑动时不受其他 Mode 影响，在滚动模式下RunLoop只处理与滚动相关的事件

一个RunLoop包含若干个Mode，每个Mode又包含若干个Source0/Source1/Timer/Observer<br>
RunLoop启动时只能选择其中一个Mode，作为currentMode<br>
如果需要切换Mode，只能退出当前Loop，再重新选择一个Mode进入<br>
如果Mode里没有任何Source0/Source1/Timer/Observer，RunLoop会马上退出
<br>
<br>
例如创建一个 Timer 并加到 DefaultMode 时，Timer 会得到重复回调，但此时滑动一个TableView时，RunLoop 会将 mode 切换为 TrackingRunLoopMode，这时 Timer 就不会被回调，并且也不会影响到滑动操作。
<br>
<br>
有时候需要一个 Timer，在两个 Mode 中都能得到回调，一种办法就是将这个 Timer 分别加入这两个 Mode。还有一种方式，就是将 Timer 加入到顶层的 RunLoop 的 “commonModeItems” 中。”commonModeItems” 被 RunLoop 自动更新到所有具有”Common”属性的 Mode 里去。

### CFRunLoopObserverRef

```objc
/* Run Loop Observer Activities */
typedef CF_OPTIONS(CFOptionFlags, CFRunLoopActivity) {
    kCFRunLoopEntry = (1UL << 0),         // 即将进入Loop
    kCFRunLoopBeforeTimers = (1UL << 1),  // 即将进入Timer
    kCFRunLoopBeforeSources = (1UL << 2), // 即将处理Source
    kCFRunLoopBeforeWaiting = (1UL << 5), // 即将进入休眠
    kCFRunLoopAfterWaiting = (1UL << 6),  // 即将从休眠中唤醒
    kCFRunLoopExit = (1UL << 7),          // 即将退出Loop
    kCFRunLoopAllActivities = 0x0FFFFFFFU
};

// 可以添加Observer来监听RunLoop的所有状态

// 创建Observer
CFRunLoopObserverRef observer = CFRunLoopObserverCreateWithHandler(kCFAllocatorDefault,kCFRunLoopAllActivities, YES, 0, ^(CFRunLoopObserverRef observer, CFRunLoopActivity activity) {
    switch (activity) {
        case kCFRunLoopEntry: {
            NSLog(@"kCFRunLoopEntry");
            break;
        }
        case kCFRunLoopBeforeTimers: {
            NSLog(@"kCFRunLoopBeforeTimers");
            break;
        }
        case kCFRunLoopBeforeSources: {
            NSLog(@"kCFRunLoopBeforeSources");
            break;
        }
        case kCFRunLoopBeforeWaiting: {
            NSLog(@"kCFRunLoopBeforeWaiting");
            break;
        }
        case kCFRunLoopAfterWaiting: {
            NSLog(@"kCFRunLoopAfterWaiting");
            break;
        }
        case kCFRunLoopExit: {
            NSLog(@"kCFRunLoopExit");
            break;
        }
            
        default:
            break;
    }
});
// 添加Observer到RunLoop中
CFRunLoopAddObserver(CFRunLoopGetMain(), observer, kCFRunLoopCommonModes);
// 释放
CFRelease(observer);
```
## RunLoop的运行逻辑
<img src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_RunLoop_1.png" referrerpolicy="no-referrer">

## RunLoop的实际应用

#### NSTimer失效

默认情况下，添加NSTimer执行timerWithTimeInterval方法，当有滚动事件触发时，会导致NSTimer失效
```objc
- (void)logCount {
    NSLog(@"1111");
}
- (void)viewDidLoad {
    [super viewDidLoad];
    
    NSTimer *timer = [NSTimer timerWithTimeInterval:1 target:self selector:@selector(logCount) userInfo:nil repeats:YES];
}
```
RunLoop在同一时间只能运行一种模式，一旦有滚动事件触发时，RunLoop会切换到UITrackingRunLoopMode模式。<br>
可以这样解决：

```objc
[[NSRunLoop currentRunLoop] addTimer:timer forMode:NSDefaultRunLoopMode];
[[NSRunLoop currentRunLoop] addTimer:timer forMode:UITrackingRunLoopMode];
```

或者也可以这样：

```objc
[[NSRunLoop currentRunLoop] addTimer:timer forMode:NSRunLoopCommonModes];
```

#### 线程保活

我们创建一个NSThread，观察下NSThread在什么情况下会dealloc
```objc
#import <Foundation/Foundation.h>

@interface MyThread : NSThread
@end

#import "MyThread.h"

@implementation MyThread
- (void)dealloc
{
    NSLog(@"%s", __func__);
}
@end
```
如上，创建了一个MyThread类，重写了dealloc方法，看dealloc什么时候被调用
```objc
- (void)viewDidLoad {
    [super viewDidLoad];
    
    MyThread *thread = [[MyThread alloc] initWithTarget:self selector:@selector(run) object:nil];
    [thread start];
}

- (void)run {
    NSLog(@"%s %@", __func__, [NSThread currentThread]);
}
```
默认情况下执行完run方法之后，线程就dealloc了。<br>
但有时候我们的需求是不要让这个线程自动的dealloc，在我们不使用它的时候，它自动dealloc掉。<br>
这时候就要用到RunLoop的东西了：
```objc
#import <Foundation/Foundation.h>

typedef void (^MyPermenantThreadTask)(void);
@interface MyPermenantThread : NSObject

/**
开启线程
*/
//- (void)run;

/**
在当前子线程执行一个任务
*/
- (void)executeTask:(MyPermenantThreadTask)task;

/**
结束线程
*/
- (void)stop;
@end
```

m 文件
```objc
#import "MyPermenantThread.h"

/** MyThread **/
@interface MyThread : NSThread
@end

@implementation MyThread

- (void)dealloc
{
    NSLog(@"%s", __func__);
}

@end

/** MyPermenantThread **/
@interface MyPermenantThread()
@property (strong, nonatomic) MyThread *innerThread;
@end

@implementation MyPermenantThread

#pragma mark - public methods
- (instancetype)init
{
    if (self = [super init]) {
        self.innerThread = [[MyThread alloc] initWithBlock:^{
            NSLog(@"begin----");
            
            // 创建上下文（要初始化一下结构体）
            CFRunLoopSourceContext context = {0};
            
            // 创建source
            CFRunLoopSourceRef source = CFRunLoopSourceCreate(kCFAllocatorDefault, 0, &context);
            
            // 往Runloop中添加source
            CFRunLoopAddSource(CFRunLoopGetCurrent(), source, kCFRunLoopDefaultMode);
            
            // 销毁source
            CFRelease(source);
            
            // 启动，第三个参数true代表执行完source后就会退出RunLoop；传false代表不退出，自己来控制RunLoop的退出
            CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1.0e10, false);
            
            // NSRunLoop的run方法 \ CFRunLoopRun()是无法停止的，它专门用于开启一个永不销毁的线程
            // 也可以自己手动创建一个while，通过属性来控制是否要销毁RunLoop
            //  while (weakSelf && !weakSelf.isStopped) {
                // 第3个参数：returnAfterSourceHandled，设置为true，代表执行完source后就会退出当前loop
                //  CFRunLoopRunInMode(kCFRunLoopDefaultMode, 1.0e10, true);
            //  }
            
            NSLog(@"end----");
        }];
        
        [self.innerThread start];
    }
    return self;
}
- (void)executeTask:(MyPermenantThreadTask)task
{
    if (!self.innerThread || !task) return;
    
    [self performSelector:@selector(__executeTask:) onThread:self.innerThread withObject:task waitUntilDone:NO];
}
- (void)stop
{
    if (!self.innerThread) return;
    // waitUntilDone 相当于同步执行，YES代表执行完线程内的任务后，往下继续执行代码
    [self performSelector:@selector(__stop) onThread:self.innerThread withObject:nil waitUntilDone:YES];
}
- (void)dealloc
{
    NSLog(@"%s", __func__);
    
    [self stop];
}
#pragma mark - private methods
- (void)__stop
{
    CFRunLoopStop(CFRunLoopGetCurrent());
    self.innerThread = nil;
}
- (void)__executeTask:(MyPermenantThreadTask)task
{
    task();
}
@end
```



> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
