# June-Music音乐电台

####预览链接
[六月音](http://www.google.com/)

### 项目功能介绍

1. 实现响应式布局
2. 获取歌单列表，点击歌单时播放歌单内的歌曲
3. 点击歌单后，背景发生变化
4. 暂停播放及下一曲按钮
5. 实现滚动歌词，及当前行高亮效果
6. 拖动进度条时，歌词及时跳转
7. 收藏歌曲到歌单/取消收藏

### 项目技术细节介绍

1. 页面布局主要使用flex布局方式，用vh做单位，实现响应式布局。
2. EventCenter：页面主要分为两个部分，main和footer，事件中心EventCenter用于关联这两个部分，当点击footer部分的歌单时，main能够响应。
3. Footer：鼠标移动到footer栏时，左右箭头显示，点击左右箭头，歌单有滑动效果。
实现思路：给ul标签设置为绝对定位，里面的li标签向左浮动，点击left-btn时，让ul标签的left值增加（增加的值为li标签的outerWidth * 当前box可容纳的li标签数量),也就是 **moveCount * liWidth**

```javascript
  var liWidth = _this.$ul.find('li').outerWidth(true);
  var moveCount = Math.floor(_this.$box.width() / liWidth);
```

在这个过程需要做判断：
>可以向左/向右滑动时需满足的条件
>当ul的left值大于等于0时，可以点击left-btn,滑动；
>如果这个box的宽度减去ul的left值大于等于ul的width时，点击right-btn将不再滑动
4. 音乐播放界面(Fm、page-music):
* 在FM部分去获取音乐的链接，更改背景图片，更新页面上的与歌曲相关的信息
* 实现歌词滚动及当前歌词高亮主要思路：
   - 解析获取到的歌曲歌词的格式
   ```
   [00:00.01]音乐来自百度FM, by 饥人谷
   [00:02.00]下雨了
   [00:04.00]
   [00:06.00]词曲：薛之谦
   [00:08.00]演唱：薛之谦
   [01:36.02][00:31.66]
   [01:37.26][00:32.24]不安 让你频频露出破绽
   [01:41.20][00:35.92]是罪犯 自然流露着罪恶感
   ```
   将返回的歌词先通过split('\n')变成数组，再进行遍历，用match()方法以正则表达式去匹配时间和歌词，因为时间可能这种[01:36.02][00:31.66]，两个时间对应一句歌词，所以需要对匹配到的时间再遍历一次，以{[00:08]:歌词}的形式存储为对象lyricObj，为了方便后面使用，分别把时间和歌词各存储为数组

   - 生成DOM节点，将歌词写入到页面上
   - 歌词滚动
   当前的歌曲的时间this.audio.currentTime的单位为秒，将其格式化为这种形式[00:08]，如果this.audio.currentTime在lyricObj中，得到this.audio.currentTime的index，让lyric-content的transform： translateY()的值移动**index * p的高度**，并设置高亮/移除高亮效果
   因为想让歌词滚动的效果不是从一开始滚动，而是在lyric-content的中间部分，所以在index小于3的时候只让其高亮，而不滚动，在大于3要滚动的时候transform： translateY()的值移动**index-3 * p的高度**

   ```javascript
   lyricScroll: function () {
        if (('0' + this.curTime) in this.lyricObj) {
            // this.$player.find('.lyric p').text(timeLine).boomText();
            this.index = this.allTime.indexOf('0' + this.curTime);
            var timeline = this.lyricObj[('0' + this.curTime)];
            if(timeline){
                if (this.index < 3) {
                    this.$player.find('.lyric p').eq(this.index).addClass('highlight').siblings().removeClass('highlight')
                } else {
                    this.$player.find('.lyric p').eq(this.index).addClass('highlight').siblings().removeClass('highlight')
                    var num = this.$player.find('.lyric p').height();
                    this.height = 0 - (this.index - 3) * num;
                    // console.log('height' + ':' + this.height);
                    // console.log('num' + ':' + num);
                    this.$player.find('.lyric-content').css('transform', 'translateY(' + this.height + 'px)');
                }
            }    
        }
    },
   ```
   - 点击进度条时，歌词跳转
   最开始的时候，只在进度条上简单的绑定了一个点击事件，后面发现点击以后，有时候歌词需要停顿一会才会跳转。因为如果点击时，this.audio.currentTime，不在lyricObj中，歌词就需要等到**在**的那个时间点才会跳转。所以后来在这又做了个处理，当点击时，如果点击的this.audio.currentTime不在lyricObj中，就找一个与this.audio.currentTime最相近的存在于lyricObj的时间点，赋值给this.audio.currentTime（为了减少误差和方便计算，这里把lyricObj里的时间换成了秒）

* 收藏/取消收藏到歌单

  实现思路：在获取歌单列表时，在数据上unshift一个自己创建的歌单
  ```javascript
    data.unshift({
            channel_id: 0,
            name: '我的最爱',
            cover_small: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
            cover_middle: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
            cover_big: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
  ```
  初始化这个歌单
  ```
  this.collections = this.loadFromLocal();
  loadFromLocal: function () {
        return JSON.parse(localStorage['collections'] || '{}')
    },
当点击收藏按钮时，判断一下这个按钮是否在高亮状态，如果没有，就增加高亮，并且以{当前歌曲的sid:_this.currentSong),存入this.collections
`
_this.collections[_this.currentSong.sid] = _this.currentSong
`
当点击歌单时，loadMusic会进行判断是否是自建歌单，如果是并且自建歌单中有歌时就会播放里面的歌曲

当取消收藏时，移除高亮效果并
`
delete _this.collections[_this.currentSong.sid]
`
### 项目收获

对页面布局的方式更加熟练，学习并掌握了Flex布局方法，jquery对于数据的获取，还有在页面播放交互中对一些小细节的处理。目前这个Fm做的还不够完美，后续还会继续完善功能。

### 技术栈关键字
jQuery、CSS3、响应式


  



