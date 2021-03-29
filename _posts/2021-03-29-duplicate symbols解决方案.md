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



> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
