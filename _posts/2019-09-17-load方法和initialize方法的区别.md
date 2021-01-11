---
layout:     post
title:      load方法和initialize方法的区别
subtitle:   
date:       2019-09-17
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## load方法

我们创建两个类，分别是`Person`类和`Student`类，`Student`类继承`Person`类， 然后再分别创建Person和Student的category类。

#### 分类里面有没有load方法？

在`Student`类或者`Person`类中添加`load`方法，是可以执行的，证明分类当中可以有load方法

#### load方法什么时候调用？

`load`方法会在`runtime`加载类、分类时自动调用。默认情况下会调用一次，但手动调用也是可以调用成功的，如[Student load];

#### load方法的调用顺序

- 先调用`类本身`的+load，调用时按照以下顺序：
    - 按照`编译先后顺序`调用（先编译，先调用；按照Xcode Build Phases中的Compile Sources顺序）
    - 如果有`继承关系`，则先调用`父类`的+load，再调用`子类`的+load
- 再调用`分类`的+load
    - 按照`编译先后顺序`调用（先编译，先调用）

### load方法的本质

通过Runtime方法把类的所有方法打印出来看看到底生成了什么方法
```objc
- (void)printMethodNamesOfClass:(Class)cls
{
    unsigned int count;
    // 获得方法数组

    Method *methodList = class_copyMethodList(cls, &count);
    
    // 存储方法名

    NSMutableString *methodNames = [NSMutableString string];
    
    // 遍历所有的方法

    for (int i = 0; i < count; i++) {
        // 获得方法

        Method method = methodList[i];
        // 获得方法名

        NSString *methodName = NSStringFromSelector(method_getName(method));
        // 拼接方法名

        [methodNames appendString:methodName];
        [methodNames appendString:@", "];
    }
    
    // 释放

    free(methodList);
    
    // 打印方法名

    NSLog(@"%@ %@", cls, methodNames);
}
```
打印发现，分类的方法和类本身的方法，都在类对象或者是元类对象里面，还是会和类自身的方法合并在一起<br>

查看objc运行时源码：
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190917100223.jpg" referrerpolicy="no-referrer">
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190917100902.jpg" referrerpolicy="no-referrer">
+load方法是根据方法地址直接调用，并不是经过objc_msgSend函数调用<br><br>

objc源码阅读顺序：
<img width="50%" height="50%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190917101037.jpg" referrerpolicy="no-referrer">



## initialize方法

#### initialize方法什么时候调用？

`+initialize`方法会在类第一次接收到消息时调用, 比如调用alloc方法

#### initialize方法调用顺序

- 先调用父类的`+initialize`，再调用子类的`+initialize`
- 先初始化父类，再初始化子类，每个类只会初始化1次（比如Student类和Teacher类继承自Person类，分别都实现了initialize方法，当调用Student和Teacher的alloc，方法调用顺序——>先调用Person类的initialize方法——>在调用Student的initialize方法——>然后再调用Teacher的initialize方法，因为调用Student的alloc时已经初始化了父类的initialize方法）

#### +initialize和+load的区别
`+initialize`是在类第一次接收到消息时调用，而`+load`方法是Runtime加载类的时候自动调用。 `+initialize`是通过objc_msgSend进行调用的

- 如果`子类`没有实现`+initialize`，会调用父类的`+initialize`（所以父类的+initialize可能会被调用多次；比如Student类继承自Person类，假如Student类没有实现`+initialize`，当给Student类发送消息时，会调用两次`+initialize`方法，一次是Person对象调用, 一次是Student对象调用）
- 如果`分类`实现了`+initialize`，就覆盖类本身的`+initialize`调用

<img width="70%" height="70%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190917141912.jpg" referrerpolicy="no-referrer">
<img width="50%" height="50%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190917142709.jpg" referrerpolicy="no-referrer">

> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
