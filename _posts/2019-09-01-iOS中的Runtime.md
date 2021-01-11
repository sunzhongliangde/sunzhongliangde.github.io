---
layout:     post
title:      iOS中的Runtime
subtitle:   
date:       2019-09-01
author:     sunzhongliang
header-img: img/post-bg-github-cup.jpg
catalog: true
tags:
    - OC
---


## Runtime

`Objective-C`是一门动态性比较强的编程语言，跟C、C++等语言有着很大的不同，程序在运行的过程中，开发者可以通过Runtime创建类、方法以及属性等等，这些动态性是由Runtime API来支撑，Runtime API提供的接口基本都是C语言的，源码由C\C++\汇编语言编写<br>

#### 共用体

在讲`Runtime`之前就需要了解一下`isa`, 而`isa`中又用到`共用体`（union）结构, 共用体结构可以帮助程序节省更多的内存空间, Apple在底层也用共用体实现了很多功能。<br>
共用体可参照 **[共用体](https://sunzhongliangde.github.io/2019/08/12/%E6%8C%89%E4%BD%8D%E6%88%96(-)-%E6%8C%89%E4%BD%8D%E4%B8%8E(&)%E5%9C%A8%E9%A1%B9%E7%9B%AE%E4%B8%AD%E7%9A%84%E5%BA%94%E7%94%A8/)**

#### isa指针

在`arm64`架构之前，`isa`就是一个普通的指针，存储着Class、Meta-Class对象的内存地址,从`arm64`架构开始，对`isa`进行了优化，变成了一个`共用体`（union）结构，还使用位域来存储更多的信息
<img width="60%" height="60%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_isa.png" referrerpolicy="no-referrer">
其代表的含义:
- **nonpointer**<br>
0，代表普通的指针，存储着Class、Meta-Class对象的内存地址<br>
1，代表优化过，使用位域存储更多的信息<br><br>
- **has_assoc**<br>
是否有设置过关联对象，如果没有，释放时会更快<br><br>
- **has_cxx_dtor**<br>
是否有C++的析构函数（.cxx_destruct），如果没有，释放时会更快<br><br>
- **shiftcls**<br>
存储着Class、Meta-Class对象的内存地址信息<br><br>
- **magic**<br>
用于在调试时分辨对象是否未完成初始化<br><br>
- **weakly_referenced**<br>
是否有被弱引用指向过，如果没有，释放时会更快<br><br>
- **deallocating**<br>
对象是否正在释放<br><br>
- **extra_rc**<br>
里面存储的值是引用计数器减1<br><br>
- **has_sidetable_rc**<br>
引用计数器是否过大无法存储在isa中<br>
如果为1，那么引用计数会存储在一个叫SideTable的类的属性中<br><br>

#### Class的结构

<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190906160050.jpg" referrerpolicy="no-referrer">

**class_rw_t**<br>
`class_rw_t`里面的methods、properties、protocols是二维数组，是可读可写的，包含了类的初始内容（方法、属性、协议等）、分类的内容
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190906160503.jpg" referrerpolicy="no-referrer">

**class_ro_t**<br>
`class_ro_t`里面的baseMethodList、baseProtocols、ivars、baseProperties是一维数组，是只读的，包含了类的初始内容
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190906160727.jpg" referrerpolicy="no-referrer">

**method_t**<br>
`method_t`是对方法\函数的封装
```objc
struct method_t {
    SEL name; // 函数名

    const char *types; // 编码(返回值类型，参数类型)

    IMP imp; // 指向函数的指针（函数地址）

};
```

**IMP**<br>
`IMP`代表函数的具体实现
```objc
typedef id _Nullable (*IMP)(id _Nonnull, SEL _Nonnull, ...);
```

**SEL**<br>
`SEL`代表方法\函数名，一般叫做选择器，底层结构跟char *类似<br>
可以通过@selector()和sel_registerName()获得<br>
可以通过sel_getName()和NSStringFromSelector()转成字符串<br>
不同类中相同名字的方法，所对应的方法选择器是相同的<br>
```objc
typedef struct objc_selector *SEL;
```

**types**<br>
types包含了函数返回值、参数编码的字符串<br>
假如定义一个这样的函数
```objc
- (void)test;
```
则types表现形式是：`v16@0:8`<br>
> 符号`v`     代表 返回值<br>
> 符号`@`     代表 第一个参数，代表id类型<br>
> 符号`:`     代表 第二个参数，代表selecter<br>

OC当中方法如果无返回值无参数，本质上其实底层是有两个参数：
```objc
// id 代表消息接收者,  _cmd代表方法名

- (void)test:(id)self _cmd:(SEL)_cmd {

}
```
types组成方式是这样的：<br>
*返回值 + 参数1 + 参数2 + ... + 参数n* <br>
若方法定义成这样：
```objc
- (int)test:(int)age height:(float)height;
```
则types表现形式是：`i24@0:8i16f20`<br>
> 符号`i`    代表返回值<br>
> 符号`24`   代表所有参数所占字节数<br>
> 符号`@0`   代表第一个参数(消息接收者)从第0个字节开始<br>
> 符号`:8`   代表第二个参数参数从第8个字节开始<br>
> 符号`i16`  代表第三个参数参数从第16个字节开始<br>
> 符号`f20`  代表第四个参数参数从第20个字节开始<br>

iOS中提供了一个叫做`@encode`的指令
```objc
NSLog(@"%s", @encode(int)); // 输出i

NSLog(@"%s", @encode(id));  // 输出@
```

**[苹果官方文档](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ObjCRuntimeGuide/Articles/ocrtTypeEncodings.html)**
Type Encodings 对照表如下:

Code | Meaning 
-|-
c | A char 
i | An int 
s | A short 
l | A long (l is treated as a 32-bit quantity on 64-bit programs.)
q | A long long
C | An unsigned char
I |An unsigned int
S | An unsigned short
L |An unsigned long
Q |An unsigned long long
f | A float
d | A double
B | A C++ bool or a C99 _Bool
v | A void
* | A character string (char *)
@ | An object (whether statically typed or typed id)
# | A class object (Class)
: | A method selector (SEL)
[array type] | An array
{name=type...} | A structure
(name=type...) | A union
bnum | A bit field of num bits
^type | A pointer to type
? | An unknown type (among other things, this code is used for function pointers)

## 方法缓存
苹果在Class对象内部结构中设计了方法缓存（cache_t），用散列表（哈希表）来缓存曾经调用过的方法，可以提高方法的查找速度<br>
假如`Student`类继承`Person`类

    Student *student = [[Student alloc] init];
    [student personTest];

1.`student`类调用`person`类的`personTest`实例方法<br>
假设没有缓存，首先会通过student的isa指针找到student的类对象，在student的类对象中寻找personTest方法，发现没找到，于是乎再继续通过student的类对象的Superclass找到person的类对象，在person的类对象中寻找到了personTest方法，然后缓存到student的类对象的cache_t中，整个方法寻找过程结束<br>
2.`person`类调用自身personTest实例方法
假设没有缓存，首先会通过person的isa指针找到person的类对象，在person的类对象中寻找personTest方法，结果找到了，然后缓存到person的类对象的cache_t中，整个方法寻找过程结束
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_%E5%9B%BE%E7%89%87%201.png" referrerpolicy="no-referrer">
<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190909101850.jpg" referrerpolicy="no-referrer">

## objc_msgSend

当我们调用一个类的实例方法以及类方法时，系统究竟在做什么？
```objc
int main(int argc, const char * argv[]) {
    @autoreleasepool {
        Person *person = [[Person alloc] init];
        [person personTest];
    }
    return 0;
}
```
我们可以通过`clang`指令将其转成C语言函数看看
```objc
xcrun -sdk iphoneos clang -arch arm64 -rewrite-objc main.mm
```
转译后的代码为：
```objc
int main(int argc, const char * argv[]) {
    /* @autoreleasepool */ 
    { 
        __AtAutoreleasePool __autoreleasepool; 
        Person *person = ((Person *(*)(id, SEL))(void *)objc_msgSend)((id)((Person *(*)(id, SEL))(void *)objc_msgSend)((id)objc_getClass("Person"), sel_registerName("alloc")), sel_registerName("init"));

        ((void (*)(id, SEL))(void *)objc_msgSend)((id)person, sel_registerName("personTest"));
    }
    return 0;
}
```
去掉一些无用代码，以及一些强制转换代码后，实际情况是：
```objc
objc_msgSend(person, sel_registerName("personTest"));
```
`第一个参数`person其实就是Person的实例对象，可以称之为`消息接收者(receiver)`<br>
`第二个参数`sel_registerName其实就是objc/runtime.h下的C语言函数，传入一个字符串返回一个
@selector。等价于`@selector(personTest)`，可以称之为`消息名称`<br>
调用objc_msgSend本质上是给消息`接收者(receiver)`发送了一个`消息名称`<br>

**OC中的方法调用，其实都是转换为objc_msgSend函数的调用**<br>
objc_msgSend的执行流程可以分为3大阶段<br>
1.消息发送<br>
2.动态方法解析<br>
3.消息转发<br>

#### 消息发送

<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190909144712.jpg" referrerpolicy="no-referrer">

#### 动态方法解析

假设在消息发送阶段没有查找到任何方法时，就会进入到动态方法解析阶段

    // 假设这里有一个other方法
    - (void)other
    {
        NSLog(@"%s", __func__);
    }
    // 动态方法解析
    + (BOOL)resolveInstanceMethod:(SEL)sel
    {
        // 判断一下是我们想要捕捉的test方法
        if (sel == @selector(test)) {
            // 获取other方法
            // Method可以理解为等价于struct method_t *
            Method method = class_getInstanceMethod(self, @selector(other));

            // 动态添加test方法的实现
            class_addMethod(self, sel,
                            method_getImplementation(method),
                            method_getTypeEncoding(method));

            // 返回YES代表有动态添加方法
            return YES;
        }
        return [super resolveInstanceMethod:sel];
    }

    // 如果是类方法，就会进入到这里，处理流程一样
    + (BOOL)resolveClassMethod:(SEL)sel;

<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190909144920.jpg" referrerpolicy="no-referrer">

#### 消息转发

假设消息发送和动态方法解析都没有找到方法，那么接下来会进入消息转发阶段

    // 消息转发,可以将selector转发到别的类当中实现
    - (id)forwardingTargetForSelector:(SEL)aSelector
    {
        if (aSelector == @selector(test)) {
            return [[Person alloc] init];
        }
        
        return [super forwardingTargetForSelector:aSelector];
    }

#### 方法签名

假设forwardingTargetForSelector没有实现，或者是返回了nil，那么接下来会进入到`方法签名`阶段

    // 方法签名：告诉方法的返回值类型、参数类型
    - (NSMethodSignature *)methodSignatureForSelector:(SEL)aSelector
    {
        if (aSelector == @selector(test:)) {
        // return [NSMethodSignature signatureWithObjCTypes:"v20@0:8i16"];
            return [NSMethodSignature signatureWithObjCTypes:"i@:i"];
        // return [[[MyCat alloc] init] methodSignatureForSelector:aSelector];
        }
        return [super methodSignatureForSelector:aSelector];
    }

如果方法签名返回的有值，接下来会调用另外一个方法：

    // NSInvocation封装了一个方法调用，包括：方法调用者、方法名、方法参数
    // anInvocation.target：方法调用者
    // anInvocation.selector：方法名
    // [anInvocation getArgument:&age atIndex:2]; 参数
    - (void)forwardInvocation:(NSInvocation *)anInvocation
    {
        // 参数顺序：receiver、selector、other arguments
        //    int age;
        //    [anInvocation getArgument:&age atIndex:2];
        //    NSLog(@"%d", age + 10);
        
        // 这种调用是可以的
        // anInvocation.target == [[MyCat alloc] init]
        // [anInvocation invoke];
        
        // 这种调用也是可以的
        [anInvocation invokeWithTarget:[[MyCat alloc] init]];
        
        //    int ret;
        //    [anInvocation getReturnValue:&ret];
        //    NSLog(@"%d", ret);
    }

<img height="100%" src="https://images.cnblogs.com/cnblogs_com/plusone/1527513/o_20190909165610.jpg" referrerpolicy="no-referrer">

#### 总结

当调用一个类的方法时，其实都是转成了系统`objc_msgSend`函数的调用<br>
1.当`objc_msgSend`通过一系列流程没有查找到方法时，会进入到动态方法解析`resolveInstanceMethod`/`resolveClassMethod方法`<br>
2.若没有实现动态方法解析，接下来会进入到消息转发`forwardingTargetForSelector`<br>
3.若没有实现`forwardingTargetForSelector`，或者forwardingTargetForSelector方法返回nil，接下来会进入到方法签名`methodSignatureForSelector`，如果methodSignatureForSelector返回值不为nil就会调用`forwardInvocation`，否则调用doesNotRecognizeSelector方法报错`unrecognized selector sent to xxxx`<br>
系统留给了开发者3个机会来处理方法的调用,以避免调用失败

## Super的本质

#### @dynamic

首先说一下`@dynamic`; @dynamic 其实是提醒编译器不要自动生成`setter`和`getter`的实现、不要自动生成成员变量；<br>
当我们定义了一个`property`的时候，其实系统自动帮我们生成了`get`和`set`方法以及一个带下划线的成员变量

    @property (assign, nonatomic) int age;
    // 系统自动生成get和set方法的实现,以及带下划线的成员变量

    int _age;
    - (void)setAge:(int)age
    {
        _age = age;
    }

    - (int)age
    {
        return _age;
    }

实际上自动生成，其实是因为`@synthesize`;

    // 为age属性生成一个_age的成员变量，以及set方法和get方法
    @synthesize age = _age,
    // 也可以定义为其他名称
    @synthesize age = _Age,

假如只写`@synthesize age`; 那么成员变量会生成为age<br>

但是有时候我们不想让编译器自动帮我们生成，我们希望在程序运行当中在去决定程序的实现

    @dynamic age;

`@dynamic` 可以标记属性不自动生成get和set方法，当我们调用model.property进行赋值时，就会报错<br>
如果是要这样做，就需要我们自己利用动态方法解析来实现`get`和`set`方法了

    // 提醒编译器不要自动生成setter和getter的实现、不要自动生成成员变量
    @dynamic age;

    void setAge(id self, SEL _cmd, int age)
    {
        NSLog(@"age is %d", age);
    }

    int age(id self, SEL _cmd)
    {
        return 120;
    }

    + (BOOL)resolveInstanceMethod:(SEL)sel
    {
        if (sel == @selector(setAge:)) {
            class_addMethod(self, sel, (IMP)setAge, "v@:i");
            return YES;
        } else if (sel == @selector(age)) {
            class_addMethod(self, sel, (IMP)age, "i@:");
            return YES;
        }
        return [super resolveInstanceMethod:sel];
    }
    // 调用
    Person *person = [[Person alloc] init];
    person.age = 20;

#### super

当我们调用`class`以及`superclass`的时候，系统究竟在底层做了什么

    [self class]; // 当前类对象
    [self superclass]; // 当前类的父类的类对象
    [super class]; // 当前类对象
    [super superclass]; // 当前类的父类的类对象

1.调用`[self class]`; 其实是在查找当前类对象<br>
2.调用`[self superclass]`; 其实是在查找当前类的父类的类对象<br>
3.调用`[super class]`; 常规理解super应该是调用当前类的父类的类对象； 其实super调用，底层会转换为objc_msgSendSuper函数的调用，接收2个参数：struct objc_super和SEL

    // objc_super2 定义
    // receiver是消息接收者
    // current_class是receiver的Class对象
    struct objc_super {
        id receiver;
        Class current_class;
    }

本质上如果调用[super class], 其实是调用objc_msgSendSuper({self, 父类的类对象}, @selector(class)); self就是消息接收者，super调用的消息接收者仍然是子类对象，只不过是先从父类的类对象中去搜索方法<br>
> [super message]的底层实现<br>
> 1.消息接收者仍然是子类对象<br>
> 2.从父类开始查找方法的实现<br>

#### isMemberOfClass

`isMemberOfClass` [obj1 isMemberOfClass obj2]; 用于比较是否是同一个类对象<br>
isMemberOfClass 底层实现：

    - (BOOL)isMemberOfClass:(Class)cls {
        return [self class] == cls;
    }

`isKindOfClass` [obj1 isKindOfClass obj2]; 用于比较左边是否等于右边的类型，或者是右边的子类<br>
isKindOfClass 底层实现：

    - (BOOL)isKindOfClass:(Class)cls {
        for (Class tcls = [self class]; tcls; tcls = tcls->superclass) {
            if (tcls == cls) return YES
        }
        return NO;
    }

如果是利用类对象来调用isMemberOfClass或者是isKindOfClass

    // 这句代码的方法调用者不管是哪个类（只要是NSObject体系下的），都返回YES
    NSLog(@"%d", [NSObject isKindOfClass:[NSObject class]]); // 1
    NSLog(@"%d", [NSObject isMemberOfClass:[NSObject class]]); // 0
    NSLog(@"%d", [MyPerson isKindOfClass:[MyPerson class]]); // 0
    NSLog(@"%d", [MyPerson isMemberOfClass:[MyPerson class]]); // 0

底层实现：

    + (BOOL)isMemberOfClass:(Class)cls {
        return object_getClass((id)self) == cls;
    }

    + (BOOL)isKindOfClass:(Class)cls {
        for (Class tcls = object_getClass((id)self); tcls; tcls = tcls->superclass) {
            if (tcls == cls) return YES;
        }
        return NO;
    }

## RunTime的应用

#### 查看私有成员变量

    // 成员变量的数量
    unsigned int count;
    Ivar *ivars = class_copyIvarList([MyPerson class], &count);
    for (int i = 0; i < count; i++) {
        // 取出i位置的成员变量
        Ivar ivar = ivars[i];
        NSLog(@"%s %s", ivar_getName(ivar), ivar_getTypeEncoding(ivar));
    }
    free(ivars);

工作当中的应用(设置UITextField占位文字的颜色)

    self.textField.placeholder = @"请输入用户名";
    [self.textField setValue:[UIColor redColor] forKeyPath:@"_placeholderLabel.textColor"];

#### 字典转model

可以实现一个NSObject的扩展，在扩展里面提供一个类方法objectWithJson来实现字典转model的功能

    + (instancetype)objectWithJson:(NSDictionary *)json
    {
        id obj = [[self alloc] init];
        
        unsigned int count;
        Ivar *ivars = class_copyIvarList(self, &count);
        for (int i = 0; i < count; i++) {
            // 取出i位置的成员变量
            Ivar ivar = ivars[i];
            NSMutableString *name = [NSMutableString stringWithUTF8String:ivar_getName(ivar)];
            [name deleteCharactersInRange:NSMakeRange(0, 1)];
            
            // 设值
            id value = json[name];
            if ([name isEqualToString:@"ID"]) {
                value = json[@"id"];
            }
            [obj setValue:value forKey:name];
        }
        free(ivars);
        
        return obj;
    }

在实际工作当中还有很多其他地方的应用


## Runtime的API

#### Runtime的API - 类

动态创建一个类（参数：父类，类名，额外的内存空间）

    Class objc_allocateClassPair(Class superclass, const char *name, size_t extraBytes)

注册一个类（要在类注册之前添加成员变量）<br><br>

    void objc_registerClassPair(Class cls) 

销毁一个类<br>

    void objc_disposeClassPair(Class cls)

获取isa指向的Class<br>

    Class object_getClass(id obj)

设置isa指向的Class<br>

    Class object_setClass(id obj, Class cls)

判断一个OC对象是否为Class<br>

    BOOL object_isClass(id obj)

判断一个Class是否为元类<br>

    BOOL class_isMetaClass(Class cls)

获取父类<br>

    Class class_getSuperclass(Class cls)

#### Runtime的API - 成员变量

获取一个实例变量信息

    Ivar class_getInstanceVariable(Class cls, const char *name)

拷贝实例变量列表（最后需要调用free释放）<br>

    Ivar *class_copyIvarList(Class cls, unsigned int *outCount)

设置和获取成员变量的值<br>

    void object_setIvar(id obj, Ivar ivar, id value)
    id object_getIvar(id obj, Ivar ivar)

动态添加成员变量（已经注册的类是不能动态添加成员变量的）<br>

    BOOL class_addIvar(Class cls, const char * name, size_t size, uint8_t alignment, const char * types)

获取成员变量的相关信息<br>

    const char *ivar_getName(Ivar v)
    const char *ivar_getTypeEncoding(Ivar v)

#### Runtime的API - 属性

获取一个属性

    objc_property_t class_getProperty(Class cls, const char *name)

拷贝属性列表（最后需要调用free释放）<br>

    objc_property_t *class_copyPropertyList(Class cls, unsigned int *outCount)

动态添加属性<br>

    BOOL class_addProperty(Class cls, const char *name, const objc_property_attribute_t *attributes,
                  unsigned int attributeCount)

动态替换属性<br>

    void class_replaceProperty(Class cls, const char *name, const objc_property_attribute_t *attributes,
                      unsigned int attributeCount)

获取属性的一些信息<br>

    const char *property_getName(objc_property_t property)
    const char *property_getAttributes(objc_property_t property)

#### Runtime的API - 方法

获得一个实例方法、类方法

    Method class_getInstanceMethod(Class cls, SEL name)
    Method class_getClassMethod(Class cls, SEL name)

方法实现相关操作<br>

    IMP class_getMethodImplementation(Class cls, SEL name) 
    IMP method_setImplementation(Method m, IMP imp)
    void method_exchangeImplementations(Method m1, Method m2) 

拷贝方法列表（最后需要调用free释放）<br>

    Method *class_copyMethodList(Class cls, unsigned int *outCount)

动态添加方法<br>

    BOOL class_addMethod(Class cls, SEL name, IMP imp, const char *types)

动态替换方法<br>

    IMP class_replaceMethod(Class cls, SEL name, IMP imp, const char *types)

获取方法的相关信息（带有copy的需要调用free去释放）<br>

    SEL method_getName(Method m)
    IMP method_getImplementation(Method m)
    const char *method_getTypeEncoding(Method m)
    unsigned int method_getNumberOfArguments(Method m)
    char *method_copyReturnType(Method m)
    char *method_copyArgumentType(Method m, unsigned int index)

选择器相关<br>

    const char *sel_getName(SEL sel)
    SEL sel_registerName(const char *str)

用block作为方法实现<br>

    IMP imp_implementationWithBlock(id block)
    id imp_getBlock(IMP anImp)
    BOOL imp_removeBlock(IMP anImp)




> 本文首次发布于 [孙忠良 Blog](https://sunzhongliangde.github.io), 作者 [@sunzhongliang] ,
转载请保留原文链接.
