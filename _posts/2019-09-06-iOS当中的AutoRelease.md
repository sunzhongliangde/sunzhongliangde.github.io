---
layout:     post
title:      iOS中的AutoRelease
subtitle:   
date:       2019-09-06
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## AutoRelease
在`MRC`时代，我们如果希望一个对象延迟释放的时候，通常会把这个对象标记为`autorelease`, 如
```objc
NSString *str = [[[NSString alloc] initWithString:@"hello"] autorelease];
```
后来在`ARC`的时候，我们甚至不用关心一个对象是什么时候release的, 系统总是能够在合适的时候帮我们去释放这个对象, 背后它究竟做了什么？

## ARC和MRC下的autorelease

#### ARC
`ARC`是苹果引入的一种自动内存管理机制，会根据引用计数自动监视对象的生存周期，实现方式是在编译时期自动在已有代码中插入合适的内存管理代码以及在 `Runtime`做一些优化。

在`ARC`的情况下，编译器会在`RunLoop`休眠前执行释放的，而它能够释放的原因就是系统在每个`runloop`迭代中都加入了自动释放池`Push`和`Pop`


#### MRC
`MRC`机制下，对一个对象标记`autorelease`后，这个对象并不会马上被释放，而是当这段语句所处的 `autoreleasepool` 进行 `drain` 操作时，所有标记了 `autorelease` 的对象的 `retainCount` 会被 -1。即 `release` 消息的发送被延迟到 `pool` 释放的时候了。

## autoreleasepool
ARC下，我们使用`@autoreleasepool{}`来使用一个AutoreleasePool，随后编译器将其改写成下面的样子：
```objc
void *context = objc_autoreleasePoolPush();
// @autoreleasepool{}中的代码
objc_autoreleasePoolPop(context);
```
这两个函数都是对`AutoreleasePoolPage`的简单封装，所以自动释放机制的核心就在于这个类<br>

每个`AutoreleasePoolPage`对象占用`4096`字节内存，用来存放内部成员变量，剩下的空间用来存放autorelease对象的地址<br>
所有的`AutoreleasePoolPage`对象是通过双向链表的形式链接到一起<br>
`autoreleasePool`一开始会调用push方法将一个`POOL_BOUNDRY`入栈，并且返回其内存地址,在`autoreleasePool`结束时会调用`pop`方法传入一个`POOL_BOUNDRY`内存地址，会从最后一个入栈的对象发送`release`消息，一直到`POOL_BOUNDRY`为止，这样就实现了一个`autoreleasePool`块的所有对象`release`原理<br>
AutoreleasePoolPage内部的`id *next`指针指向了下一个能够存放autorelease对象的的地址，调用push时，从`id *next`获取下一个要存放的地址
<br>

*所以，向一个对象发送- autorelease消息，就是将这个对象加入到当前`AutoreleasePoolPage`的栈顶next指针指向的位置*

## Autorelease Pool 的用处
```objc
for (int i = 0; i < 100000000; i++)
{
    @autoreleasepool
    {
        NSString* string = @"ab c";
        NSArray* array = [string componentsSeparatedByString:string];
    }
}
```
当我们需要创建和销毁大量的对象时，使用手动创建的 `autoreleasepool` 可以有效的避免内存峰值的出现。因为如果不手动创建的话，外层系统创建的 `pool` 会在整个 `runloop circle` 结束之后才进行 `drain`，手动创建的话，会在 `block` 结束之后就进行 `drain` 操作。
如果不使用 `autoreleasepool` ，需要在循环结束之后释放 100000000 个字符串，如果 使用的话，则会在每次循环结束的时候都进行 `release` 操作。


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
