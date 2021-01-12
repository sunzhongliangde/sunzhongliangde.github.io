---
layout:     post
title:      CocoaPods Error installing解决方案
subtitle:   
date:       2021-01-10
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## Error installing
经常在安装cocoapods的的时候出现：Error installing xxx, 比如最常见的是spec仓库在goole上面的：
<img height="100%" src="https://upload-images.jianshu.io/upload_images/7823606-66e8c78711c305b3.png?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp" referrerpolicy="no-referrer">
由于https://chromium.googlesource.com/ 无法访问，所以导致无法安装，一种方案是采用科学上网工具，另外其他方案则是绕开这个网站的下载

- 更改pod spec主仓库源 <br>
在自己项目的Podfile文件顶部加一句`source 'https://mirrors.tuna.tsinghua.edu.cn/git/CocoaPods/Specs.git'`，这段代码意思是使用清华大学的源去下载所有的pod spec<br>
弊端：可能还会有某些仓库无法下载(由于源的同步时间问题，还有比如第三方仓库指定仓库源的问题，导致还有可能无法下载)

- 更改无法下载的spec的源<br>
比如我们碰到`libwebp`无法下载，那么我们看一下主仓库的源在哪，执行`pod repo`
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1750683/o_210112034332WX20210112-114221@2x.png" referrerpolicy="no-referrer">
看到path是/Users/apple/.cocoapods/repos/trunk， 那么我们就到这个path下，然后在到`Specs`目录下，依次到`1 -> 9 -> 2 -> libwep`(为什么是1，9，2，因为这个是libwepb的16进制算出来的,这是cocoapods为了避免单个文件夹暴大引起搜索缓慢而解决的)，然后找到指定的无法下载的版本(我们这里是1.1.0)
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1750683/o_210112034915WX20210112-114858@2x.png" referrerpolicy="no-referrer">
然后去更改这个路径，将其更改为https://github.com/webmproject/libwebp.git <br>
更改完毕，保存，然后再去项目目录执行`pod install`即可<br>
弊端：会引起Podfile.lock文件的变化, 比如：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1750683/o_210112035132WX20210112-112752@2x.png" referrerpolicy="no-referrer">
这个时候，我们再把之前改的spec source路径revert掉，再执行pod install就好啦.（由于cocoapods cache已经有我们刚刚install掉的缓存了，所以revert掉是没问题的，记得不要清空这个缓存就好啦）

- 将别人已经下载好的spec发一份过来
这个解决方案是借助于cocoapods的缓存，跟上一步解决思路是差不多的<br>
到/Users/apple/Library/Caches/CocoaPods/Pods/Release/libwebp （路径依据每个人的电脑名而不同）目录去，将别人发过来的spec仓库放在这里就好了, 然后再执行pod install即可



> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
