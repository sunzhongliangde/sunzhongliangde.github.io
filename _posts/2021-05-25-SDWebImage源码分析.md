---
layout:     post
title:      SDWebImage源码分析
subtitle:   
date:       2021-05-25
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## 前言
[SDWebImage](https://github.com/SDWebImage/SDWebImage)是我们做iOS开发的时候一个比较常用的图片缓存加载库，对于一个优秀的三方库，就很有必要对它的源码进行阅读和学习，学习优秀的源码，还有助于提高我们的实力。

## 系统结构
一个优秀的框架应当具备`"把简洁留给别人, 把复杂留给自己"`特性，来看下它的系统结构设计
<img height="100%" src="https://raw.githubusercontent.com/SDWebImage/SDWebImage/master/Docs/Diagrams/SDWebImageHighLevelDiagram.jpeg" referrerpolicy="no-referrer">
由系统结构图，将`SDWebImage`可以分为两类：

- 核心类
    - `**SDWebImageManager**` 提供加载&取消图片以及缓存处理等，提供了加载图片的统一接口
    - `**SDImageCachesManager**` 负责SDWebImage的整个缓存工作，提供了缓存存储、删除、查找等功能。
    - `**SDImageLoaderManager**`  提供全局image loader管理
    - `**SDImageCodersManager**` 提供图片的解码工作，编码器数组是一个优先级队列，后面添加的编码器将具有最高优先级
    - `**SDWebImageDownloader**` 图片的下载中心，管理图片的下载队列
- 工具类
    - `**UIButton+WebCache**` 支持UIButton加载图片的工具类
    - `**NSData+ImageContentType**` 根据图片数据获取图片的类型，比如GIF、PNG等
    - `**UIImage+MultiFormat**` 根据UIImage的data生成指定格式的UIImage
    - `**UIImage+GIF**` 传入一个GIF的NSData，生成一个GIF的UIImage
    - `**UIView+WebCache**` 所有的UIView及其子类都会调用这个分类的方法来完成图片加载的处理，同时通过UIView+WebCacheOperation分类来管理请求的取消和记录工作
    - `**SDAnimatedImageView+WebCache**` 提供SDAnimatedImageView.h加载GIF的能力(需使用SDAnimatedImageView)


## SDWebImage加载图片时序
<img height="100%" src="https://raw.githubusercontent.com/SDWebImage/SDWebImage/master/Docs/Diagrams/SDWebImageSequenceDiagram.png" referrerpolicy="no-referrer">
`SDWebImage`加载图片的顺序如下：

- 组件调用`sd_setImageWithURL`, 最终都会执行到`UIView+WebCache`的`sd_internalSetImageWithURL:`方法
- 进入到`SDWebImageManager`的`loadImageWithURL:options:`方法
- 判断是否是黑名单url(多次加载失败就进入黑名单), 如果是则直接返回`Image url is blacklisted`
- 进入到`callCacheProcessForOperation:`执行`queryImageForKey`方法查找缓存
- 

## SDWebImage缓存设计

## SDWebImage解码设计

> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
