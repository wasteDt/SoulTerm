  # 一个井号加空格为一级标题

## 连续两个井号加一个空格为二级标题

### 以此类推三级标题

###### 最多为六级标题

**第一段文本信息，加粗在文字的前后和结尾加上两个星号** 

__前后加上下划线也可以达到同样的效果__

只加粗**文本**两个字

*斜体首尾加上一个星号或者下划线*

***三个星号既可以斜体也可以加粗***

~~波浪符号首尾两个可以横杠~~

***

两段文字的**分割线**，空一行连续写三个星号（三个或者三个以上）

* 星号加空格，**无序列表**（ *  、-  、+  ）


* 换行后直接可以补上
- 这个是➖加空格的无序列表
- 额怎么感觉区别不大？这也是减号
+ 这是加号的无序列表
+ 额好像也没区别，这也是加号

连续两个换行跳出无序列表，-和+和*一样都是无序列表，但混用时表示不同的列表

1. **有序列表**，数字加点加空格

2. 换行会补上

3. 第一行的数字可以自定义，换行后按顺序补齐。

  这是将要换行的文字，直接换行是在列表内进行换行的，而不是一段新的文字

4. 嗷嗷怎么和网上教程不一样，好懵逼呀。

列表末尾连续换两行为一个新的段落

**勾选框：** *  [ ]  回车

* [ ] 勾选框：星号 空格 英文的中括号[中括号里面空格] 再空格就是勾选框，额额好麻烦呀
* [x] 标记勾选：把中括号里面的空格改为X(大小写都可)。OMG！typora可以直接勾选

**识别代码块：**在代码前面加四个空格，不然识别为普通文本

    .red {
    
    ​            width: 100px;
    
    ​            height: 100px;
    
    ​            background-color: brown;
    
    ​        }
    
    ​        .orange {
    
    ​            width: 200px;
    
    ​            height: 200px;
    
    ​            background-color: orange;
    
    ​        }
**识别代码块第二中方式：**英文单引号，代码首位打三个

```css  
.red {

            width: 100px;

            height: 100px;

            background-color: brown;

        }

        .orange {

            width: 200px;

            height: 200px;

            background-color: orange;

        }
```

**行内代码：**在代码前后分别加上一个英文单引号。例如：我们比较两个字符串对象时，需要用到`equals()`方法

**引用内容：**“> ”

> 引用内容：用一个大于符号。i瓯第十七号u是否士大夫 算法是说的话
> * 可以嵌套列表  
> * 咧白哦uawh
> ```css
> div {
            width: 300px;
            height: 300px;
            background-color: plum;
        }
  ```
> > 可以叠加嵌套引用文本
> > >三重
* 也可以在其他内容里嵌套引用
    > 这是一个引用文本
* 列表二

**超链接方法一：**[文本]（网页链接）

想要购买XXX请前往[官网](https://www.baidu.com) （跳转链接CTRL+单键）

**方法二：**

定义变量名:

[想要][a]购买[XXX][b]请前往[官网][a]

[a]:http://baidu.com
[b]:https://itbaima.cn

**标注：**想要购买请前往我们的官网[^1]
[^1]: 我是脚注

**图片的插入**（调整不了大小，可以用HTML标签调整）：英文的感叹号！+ [] + (图片链接)![可写可不写](https://www.baidu.com/img/PCtm_d9c8750bed0b3c7d089fa7d55720d6cf.png)

**表格：**
| 姓名 | 年龄 | 性别 |
| ---- | ---- | ---- |
| 张三 | 18   | 男   |
| 里斯 | 17   | 男   |

**嵌入自定义HTML内容**(支持css样式)：<span style="color: red;font-size: 30px;">一张壁纸</span>
<img style="width: 400px;height:250px" src="C:\Users\administered\OneDrive\Desktop\GIT-DEMO\images\WallpaperEngineOverride_randomAPJXXT.jpg">

**嵌入网页视频：**

<iframe src="//player.bilibili.com/player.html?isOutside=true&aid=364406085&bvid=BV1v94y1b7jd&cid=1291680099&p=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>

==高亮文本==：（前后加上两等号“==   ==”）

**上标：**X^2^ （在数字前后加上向上的尖：^ 字符 ^）

**下标：**X~2~（在字符前后加上波浪线：~ 字符 ~）

**数学公式：**$x=1+y$（公式前后加上一个美元符），**下标**用字母加下划线和字符就可以表示了：$x_2$（ x _  2，前后需要用 美元符 ），**上标**只用加一个尖括号就可以表示：$x^2$，可以**同时使用：**$x_2^{2x}$

**多行数学公式：**
$$
x=1+y\\
\frac{1}{2}
$$
**分数表示：**$\frac{1}{2}$（在美元符中间，添加\ frac）

**开方：**$\sqrt[3]{4}$（\sqrt[次方]{数字}）

**数学符号：**

* $\not=$（ \not= 表示**不等于**）
* $\approx=$（ \approx= 表示**约等于**）
* $\leq$（ \leq 表示**小于等于**）
* $\geq$（ \geq 表示**大于等于**）
* $\times$（ \times 表示**乘号**）
* $\div$（ \div 表示**除号**）
* $\pm$（ \pm 表示**正负号**）
* $\sum$（ \sum 表示**求和符号**，可以配合上下标使用：$\sum^2_{i=1}=x$）
* $\infty$（ \infty 表示**无穷**）
* $\int$（ \int 表示**定积分**）
* $\iint$（加几个 i 表示**几重积分**，最多四重）
* $y\prime$（ y\prime 表示**对y求导**）
* $\lim$（ \lim 表示**求极限**，可以配合下标使用：$\lim_{i\rightarrow1}$，**箭头：**\rightarrow，\leftarrow）
* $\emptyset$（ \emptyset 表示**空集**）
* $\in$（ \in 表示**属于**）
* $\notin$（ \notin 表示**不属于**）
* $\supset$（ \supset 表示**真包含**）
* $\supseteq$（ \supseteq 表示**包含**）
* $\bigcap$（ \bigcap 表示**求交集**）
* $\bigcup$（ \bigcup 表示**求并集**）
* $\cdots$（ \cdots 表示**省略号**）

**三角函数：**

* 90$^\circ$（度数用上标表示：数字 ^\circ）
* $\sin\pi$（\sin\pi）
