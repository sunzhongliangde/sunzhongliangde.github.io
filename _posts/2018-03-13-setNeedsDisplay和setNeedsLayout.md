---
layout:     post
title:      setNeedsDisplay和setNeedsLayout
subtitle:   
date:       2018-03-13
author:     sunzhongliang
header-img: img/post-bg-2015.jpg
catalog: true
tags:
    - OC
---

## UIView
#### layoutSubviews
`layoutSubviews`不能直接调用，其调用时机：
-   init初始化不会触发layoutSubviews
但是是用initWithFrame 进行初始化时，当rect的值不为CGRectZero时,也会触发
-   addSubview会触发layoutSubviews
-   设置view的Frame会触发layoutSubviews，当然前提是frame的值设置前后发生了变化
-   滚动一个UIScrollView会触发layoutSubviews
-   旋转Screen会触发父UIView上的layoutSubviews事件
-   改变一个UIView大小的时候也会触发父UIView上的layoutSubviews事件

#### setNeedsDisplay
`setNeedsDisplay`方法需要在主线程调用，会通知系统视图的内容需要重绘。但此方法不会立即执行更新，而是会等待下一个绘制周期，此时将会更新所有需要标记的更新。

#### setNeedsLayout
`setNeedsLayout`方法需要在主线程调用，标记为需要重新布局，异步调用`layoutIfNeeded`刷新布局，不立即刷新，但`layoutSubviews`一定会被调用。setNeedsLayout在receiver标上一个需要被重新布局的标记，在系统runloop的下一个周期自动调用layoutSubviews

#### layoutIfNeded
如果有需要刷新的标记，立即调用layoutSubviews进行布局（如果没有标记，不会调用layoutSubviews）

## CALayer
#### displayLayer
`CALayer`有一个可选的delegate属性，实现了`CALayerDelegate`协议。UIView作为CALayer的代理实现了`CALayerDelegate`协议<br>
当需要重绘时，即调用`-drawRect:`方法，`CALayer`请求其代理给予一个寄宿图来显示。<br>
CALayer首先会尝试调用`-displayLayer:`方法，此时代理可以直接设置contents属性<br>
如果代理没有实现`-displayLayer:`方法，CALayer则会尝试调用`-drawLayer:inContext:`方法。在调用该方法前，CALayer会创建一个空的寄宿图（尺寸由bounds和contentScale决定）和一个Core Graphics的绘制上下文，为绘制寄宿图做准备，作为context参数传入。


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.