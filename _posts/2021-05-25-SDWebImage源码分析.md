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
<img height="100%" src="https://raw.githubusercontent.com/SDWebImage/SDWebImage/master/Docs/Diagrams/SDWebImageHighLevelDiagram.jpeg
" referrerpolicy="no-referrer">
由系统结构图，将`SDWebImage`可以分为三类：

- 核心类
    - **SDWebImageManager** 提供加载&取消图片以及缓存处理等，提供了加载图片的统一接口
    - **SDImageCachesManager** 负责SDWebImage的整个缓存工作，提供了缓存存储、删除、查找等功能。
    - **SDImageLoaderManager**  提供全局image loader管理
    - **SDImageCodersManager** 提供图片的解码工作，编码器数组是一个优先级队列，后面添加的编码器将具有最高优先级
    - **SDWebImageDownloader** 图片的下载中心，管理图片的下载队列
- 工具类
    - **UIButton+WebCache** 支持UIButton加载图片的工具类
    - **NSData+ImageContentType** 根据图片数据获取图片的类型，比如GIF、PNG等
    - **UIImage+MultiFormat** 根据UIImage的data生成指定格式的UIImage
    - **UIImage+GIF** 传入一个GIF的NSData，生成一个GIF的UIImage
    - **SDAnimatedImageView+WebCache** 提供SDAnimatedImageView.h加载GIF的能力(使用UIImageView加载GIF是不行的)


> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
