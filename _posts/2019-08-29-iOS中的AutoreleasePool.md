---
layout:     post
title:      iOS中的AutoreleasePool
subtitle:   
date:       2019-08-29
author:     sunzhongliang
header-img: img/post-bg-2015.jpg
catalog: true
tags:
    - OC
---


## AutoreleasePool工作流程
主要底层数据结构是：`__AtAutoreleasePool`、`AutoreleasePoolPage`,调用了`autorelease`的对象最终都是通过`AutoreleasePoolPage`对象来管理的

#### autoreleasePoolPage的结构
```objc
class AutoreleasePoolPage 
{
    PAGE_MAX_SIZE；//最大size 4096字节
    magic_t const magic; //用来校验AutoreleasePoolPage的结构是否完整
    id *next;//指向下一个即将产生的autoreleased对象的存放位置（当next == begin()时，表示AutoreleasePoolPage为空；当next == end()时，表示AutoreleasePoolPage已满
    pthread_t const thread;//指向当前线程，一个AutoreleasePoolPage只会对应一个线程，但一个线程可以对应多个AutoreleasePoolPage；
    AutoreleasePoolPage * const parent;//指向父结点，第一个结点的 parent 值为 nil；
    AutoreleasePoolPage *child;//指向子结点，最后一个结点的 child 值为 nil；
    uint32_t const depth;//代表深度，第一个page的depth为0，往后每递增一个page，depth会加1；
}
```
<img height="100%" src="https://upload-images.jianshu.io/upload_images/9929392-2ea6a6b46b908967.png?imageMogr2/auto-orient/strip|imageView2/2/w/413/format/webp" referrerpolicy="no-referrer">


#### autoreleasePool工作原理
`autoreleasepool`本质上就是一个指针堆栈,内部结构是由若干个以`AutoreleasePoolPage`对象为结点的双向链表组成，系统会在需要的时候动态地增加或删除page节点，如下图即为`AutoreleasePoolPage`组成的双向链表：
<img height="100%" src="https://upload-images.jianshu.io/upload_images/9929392-a62c677ae826c601.png?imageMogr2/auto-orient/strip|imageView2/2/w/1006/format/webp" referrerpolicy="no-referrer">

**运行流程：**

1. 在运行循环开始前，系统会自动创建一个`autoreleasepool`(一个autoreleasepool会存在多个AutoreleasePoolPage)，此时会调用一次`objc_autoreleasePoolPush`函数，runtime会向当前的`AutoreleasePoolPage`中add进一个`POOL_BOUNDARY`（哨兵对象），代表autoreleasepool的起始边界地址），并返回此哨兵对象的内存地址
2. next指针则会指向POOL_BOUNDARY（哨兵对象）后面的地址（对象地址1）
3. 后面我们创建对象，如果对象调用了`autorelease`方法（ARC编译器会给对象自动插入autorelease），则会被添加进`AutoreleasePoolPage`中，位置是在`next`指针指向的位置，如上面next指向的是对象地址1，这是后添加的对象地址就在对象地址1这里，然后next就会 指向到对象地址2 ，以此类推，每添加一个地址就会向前移动一次，直到指向`end()`表示已存满
4. 当不断的创建对象时，`AutoreleasePoolPage`不断存储对象地址，直到存满后，则又会创建一个新的`AutoreleasePoolPage`，使用`child`指针和`parent`指针指向下一个和上一个page，从而形成一个双向链表.
5. 当调用`objc_autoreleasePoolPop`(哨兵对象地址)时，假设我们如上图，添加最后一个对象地址8，那么这时候就会依次由对象地址8 -> 对象地址1，每个对象都会调用release方法释放，直到遇到哨兵对象地址为止

## autoreleasepool的嵌套
当多个`autoreleasepool`嵌套，对象的释放，会是什么情况呢？
每次新建一个`@autoreleasepool`,就会执行一次`push`操作，对应的具体实现就是往`AutoreleasePoolPage`中的`next`位置插入一个`POOL_BOUNDARY`（哨兵对象）
```objc
@autoreleasepool   {//autoreleasepool1
    NSObject * obj1 = [[NSObject alloc] init];
   
    @autoreleasepool  {//autoreleasepool2
        NSObject * obj2 = [[NSObject alloc] init];
        NSObject * obj3 = [[NSObject alloc] init];
    }
}
```
<img height="100%" src="https://upload-images.jianshu.io/upload_images/9929392-0cb3440e81b1a067.png?imageMogr2/auto-orient/strip|imageView2/2/w/277/format/webp" referrerpolicy="no-referrer">

**释放流程**:

1. 当autoreleasepool1创建时，会添加哨兵对象1，接着obj1的创建，则把obj1地址添加进来。
2. 当autoreleasepool2创建，会添加哨兵对象2，位置是obj1后面（上面next指针指向原理），然后依次把obj2和obj3加进来。
3. 当autoreleasepool2结束时，obj3，obj2，会找到离它们最近的autoreleasepool即
autoreleasepool2，然后依次调用release，直到哨兵对象2位置。
4. 当autoreleasepool1结束时，当obj1调用release，直到哨兵对象1位置，

## Runloop和Autorelease
iOS在主线程的`Runloop中`注册了2个`Observer`
第1个Observer监听了`kCFRunLoopEntry`事件，会调用`objc_autoreleasePoolPush()`
第2个Observer
监听了`kCFRunLoopBeforeWaiting`事件，会调用`objc_autoreleasePoolPop()`、`objc_autoreleasePoolPush()`
监听了`kCFRunLoopBeforeExit`事件，会调用`objc_autoreleasePoolPop()`


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
