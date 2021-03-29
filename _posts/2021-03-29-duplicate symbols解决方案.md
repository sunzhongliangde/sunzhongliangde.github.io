---
layout:     post
title:      duplicate symbols解决方案
subtitle:   
date:       2021-03-29
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## 前言
`duplicate symbol '_OBJC_CLASS_$_XXX'`, 这个错误其实含义是告诉我们在链接的时候有重复的符号，今天来看下这个问题发生的本质以及解决方案。<br>
<br>
一个工程的源代码最终变成二进制的可执行程序、动态链接库或静态链接库要经历这么几个过程：<br>
`源代码` - [编译器] ---> `汇编码` - [汇编器] ---> `对象文件` - [链接器] ---> `可执行程序、动态链接库或静态链接库`<br>
<br>
我们在源码中写的`全局变量名`、`函数名`或`类名`在生成的`*.o`对象文件中都叫做`符号`，存在一个叫做`符号表`的地方。<br>
<br>
举个例子：我们在`a.c`文件中写了一个函数叫`foo()`，然后在`main.c`文件中调用了`foo()`函数，<br>
在将源码编译生成的对象文件中`a.o`对象文件中的符号表里保存着`foo()`函数符号，并通过该符号可以定位到`a.o`文件中关于`foo()`方法的具体实现代码。<br>
链接器在链接生成最终的二进制程序的时候会发现`main.o`对象文件中引用了符号`foo()`，而`foo()`符号并没有在`main.o`文件中定义，所以不会存在与`main.o`对象文件的符号表中，于是链接器就开始检查其他对象文件，当检查到`a.o`文件中定义了符号`foo()`，于是就将`a.o`对象文件链接进来。这样就确保了在`main.c`中能够正常调用`a.c`中实现的`foo()`方法了

## libWeiboSDK.a
以`微博SDK`为例，看下它的静态库里面都有啥东西(静态库本质上是用的一个叫ar的压缩工具压缩的，所以我们也要使用ar命令解压)<br>
在命令行中执行`ar -x lieWeiboSDK.a`:
```
apples-MacBook-Pro-2:libWeiboSDK apple$ ar -x libWeiboSDK.a
ar: libWeiboSDK.a is a fat file (use libtool(1) or lipo(1) and ar(1) on it)
ar: libWeiboSDK.a: Inappropriate file type or format
```
很明显报错了，它告诉我们这个文件太肥了，并且提示我们使用libtool或者lipo和ar<br>
之所以这样，是由于`libWeiboSDK.a`包含了`armv7 arm64 x86_64 i386`的架构，所以才这么肥，我们通过命令`lipo -info libWeiboSDK.a`来验证一下：
```
apples-MacBook-Pro-2:libWeiboSDK apple$ lipo -info libWeiboSDK.a
Architectures in the fat file: libWeiboSDK.a are: armv7 arm64 x86_64 i386
```
既然这样，那我们需要给它瘦身一下，使用命令`lipo -thin i386 libWeiboSDK.a -output libWeiboSDK.i386.a`<br>
现在再使用`ar -x libWeiboSDK.i386.a`命令查看它里面都有神马：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1750683/o_2103290828521617006480099.jpg" referrerpolicy="no-referrer">
这些对象文件就是给链接器最终生成静态链接库时用到的文件

## 解决方案
先来回顾一下`-ObjC 、 -all_load 、-force_load`这三个flag的区别：
- -ObjC: 链接器会加载静态库中所有的Objective-C类和Category；（导致可执行文件变大）
- -all_load: 链接器会加载静态库中所有的Objective-C类和Category（这里和上面一样）；当静态库只有Category时-ObjC会失效，需要使用这个flag
- -force_load: 加载特定静态库的全部类，与-all_load类似但是只限定于特定静态库，所以-force_load需要指定静态库；当两个静态库存在同样的符号时，使用-all_load会出现duplicate symbol的错误，此时可以选择将其中一个库-force_load；（需要注意两个库的版本是不是一致的

#### 解决方案一
在主工程中`compile source`去掉同名的`.m`文件, 工程中仅保留同名的`.h`文件(假设冲突的文件是同一个版本)，这个时候我们编译就通过了(实际上调用的是静态库中的方法)

#### 解决方案二
剔除`静态库`当中的冲突的文件名符号,静态库依赖的冲突文件会在链接时找到主工程生成的文件；
1. 查看静态库包含的架构，并对其进行瘦身分成n个架构文件
2. 使用`ar xv libWeiboSDK.i386.a`对这些文件进行解压
3. 手动删除冲突的`.o`文件
4. 使用`ar rcs libWeiboSDK.i386.a *.o`重新对文件进行打包
5. 依次对解压的n个文件进行这些操作
6. 然后对这些架构文件进行合并`lipo -create libWeiboSDK.i386.a libWeiboSDK.armv7.a -output libWeiboSDK.a`

> 以上解决方案适用于冲突文件是同一版本的，若不同版本的还需要修改文件名才行



> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
