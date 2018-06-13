//事件中心
var EventCenter = {
    on: function (type, handler) {
        $(document).on(type, handler);
    },
    fire: function (type, data) {
        $(document).trigger(type, data);
    }
};
//footer

var Footer = {
    init: function () {
        this.$footer = $('footer');
        this.$ul = this.$footer.find('.song-lists');
        this.$box = this.$footer.find('.box');
        this.$leftBtn = this.$footer.find('.fa-chevron-left');
        this.$rightBtn = this.$footer.find('.fa-chevron-right');
        this.toEnd = false;
        this.toStart = true;
        this.animate = false;
        this.getData();
        this.bind();
    },
    bind: function () {
        var _this = this;
        $(window).resize(function () {
            _this.setStyle();
        })
        this.$leftBtn.on('click', function () {
            if (_this.animate) return
            var liWidth = _this.$ul.find('li').outerWidth(true);
            var moveCount = Math.floor(_this.$box.width() / liWidth);
            if (_this.toStart == false) {
                _this.animate = true;
                _this.$ul.animate({
                    left: '+=' + moveCount * liWidth,
                }, 400, function () {
                    _this.animate = false;
                    _this.itoEnd = false;
                    console.log(parseFloat(_this.$ul.css('left')));
                    if (parseFloat(_this.$ul.css('left')) >= 0) {
                        _this.toStart = true;
                        // _this.$rightBtn.addClass('disabled');
                    }
                })
            }
        })
        this.$rightBtn.on('click', function () {
            if (_this.animate) return
            var liWidth = _this.$ul.find('li').outerWidth(true);
            var moveCount = Math.floor(_this.$box.width() / liWidth);
            if (_this.toEnd == false) {
                _this.animate = true;
                _this.$ul.animate({
                    left: '-=' + moveCount * liWidth,
                }, 400, function () {
                    _this.animate = false;
                    _this.toStart = false;
                    if (_this.$box.width() - parseFloat(_this.$ul.css('left')) >= parseFloat(_this.$ul.css('width'))) {
                        _this.toEnd = true;
                    }
                })
            }
        })
        this.$ul.on('click', 'li', function () {
            $(this).addClass('active')
                .siblings().removeClass('active');

            EventCenter.fire('select-album', {
                channelId: $(this).attr('data-channel-id'),
                channelName: $(this).attr('data-channel-name')
            });
        })


    },
    getData: function () {
        var _this = this;
        $.getJSON('http://api.jirengu.com/fm/getChannels.php')
            .done(function (ret) {
                // console.log(ret);
                _this.render(ret.channels);
            }).fail(function () {
                console.log('error');
            })
    },
    render: function (data) {
        console.log(data)
        var tpl = " ";
        data.unshift({
            channel_id: 0,
            name: '我的最爱',
            cover_small: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-small',
            cover_middle: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-middle',
            cover_big: 'http://cloud.hunger-valley.com/17-10-24/1906806.jpg-big',
        })
        data.forEach(function (list) {
            tpl += '<li data-channel-id=' + list.channel_id + ' data-channel-name=' + list.name + '>' +
                '<div class="cover" style="background-image:url(' + list.cover_small + ')"></div>' +
                '<h3>' + list.name + '</h3>' +
                '</li>'
        });
        this.$ul.html(tpl);
        this.setStyle();
    },
    setStyle: function () {
        var count = this.$footer.find('li').length;
        var width = this.$footer.find('li').outerWidth(true);
        this.$ul.css({
            width: count * width + 'px'
        })
    }
}
//section
var Fm = {
    init: function () {
        this.$player = $('#page-music');
        this.audio = new Audio();
        this.audio.autoplay = true;
        this.height = 0;
        this.index = 0;
        this.action = false; //进入页面时，防止点击播放按钮报错
        this.collections = this.loadFromLocal();
        this.currentSong = null;
        this.bind();

        // EventCenter.fire('select-albumn', {
        //     channelId: '0',
        //     channelName: '我的最爱'
        // })
    },
    bind: function () {
        var _this = this;
        var $btn = this.$player.find('.btn-play');
        var $heart = this.$player.find('.fa-heart');
        //切换专辑时，相应的获取音乐连接，相关的音乐信息，改变背景图片
        EventCenter.on('select-album', function (e, channelObj) {
            console.log('select ', channelObj)
            _this.channelId = channelObj.channelId;
            _this.channelName = channelObj.channelName;
            _this.loadMusic();
            _this.action = true;
            $btn.removeClass('fa-play').addClass('fa-pause');
        });
        //收藏按钮
        $heart.on('click', function () {
            if(_this.action == false) return;
            if ($heart.hasClass('highlight')) {
                $heart.removeClass('highlight')
                delete _this.collections[_this.currentSong.sid]
            } else {
                $heart.addClass('highlight')
                _this.collections[_this.currentSong.sid] = _this.currentSong
            }
            _this.saveToLocal()
        })
        //按钮事件绑定,控制歌曲的暂停和播放
        $btn.on('click', function () {
            if ($btn.hasClass('fa-play') && _this.action) {
                _this.audio.play();
                $btn.removeClass('fa-play').addClass('fa-pause');
            } else {
                _this.audio.pause();
                $btn.removeClass('fa-pause').addClass('fa-play');
            }
        });
        //点击下一曲按钮，获取下一首歌
        this.$player.find('.fa-step-forward').on('click', function () {
            $btn.removeClass('fa-play').addClass('fa-pause');
            _this.loadMusic();
            _this.height = 0;
        });

        //显示当前播放时间和总的音乐时长,进度条
        this.audio.onplay = function () {
            console.log('play')
            //在播放下一曲前清除setInterval
            clearInterval(_this.clock);
            //设定setInterval,执行歌曲时间变化函数和歌词滚动函数
            _this.clock = setInterval(function () {
                _this.upTimeState();
                _this.lyricScroll();
            }, 1000)
        }
        //暂停时，清除setInterval
        this.audio.onpause = function () {
            clearInterval(_this.clock);
            console.log('pause')
        }
        //拖动音乐进度条
        _this.$player.find('.progress').on('click', function (e) {
            var percent = e.offsetX / parseInt(getComputedStyle(this).width);
            var realTime = percent * _this.audio.duration;
            var realTimeLine = []
            if('0'+_this.timeFormat(realTime) in _this.lyricObj){
                _this.audio.currentTime = realTime;
            }
            else{
                _this.allTime.forEach(function(time){
                    var min = Number(time.match(/\d{2}/))
                    var sec = Number(String(time.match(/\:\d{2}/)).slice(1));
                    var ttime = min*60+sec;
                    realTimeLine.push(ttime);
                })
                realTimeLine.sort(function(a,b){
                    return Math.abs((realTime-a)) - Math.abs((realTime-b))
                })
                _this.audio.currentTime = realTimeLine[0];
            }
            // _this.audio.currentTime = percent * _this.audio.duration;
        })

    },
    loadMusic: function () {
        var _this = this;
        if (this.channelId === '0') {
            _this.loadCollection()
        } else {
            $.getJSON('https://jirenguapi.applinzi.com/fm/getSong.php', {
                    channel: this.channelId
                })
                .done(function (ret) {
                    console.log(ret.song);
                    _this.song = ret.song[0];
                    _this.setMusic(_this.song);
                    _this.loadLyric();
                })
                .fail(function () {
                    console.log('error');
                });
        }
    },
    setMusic: function (data) {
        console.log(data);
        this.currentSong = data;
        this.audio.src = data.url;
        $('.bg').css({'background-image':'url(' + data.picture + ')','background-size':'cover','background-repeat':'no-repeat'});
        this.$player.find('.aside figure').removeClass('fa-music').css('background-image', 'url(' + data.picture + ')');
        this.$player.find('.detail .song-name').text(data.title);
        this.$player.find('.detail .singer').text(data.artist);
        this.$player.find('.detail .song-list').text(this.channelName);

        if(this.collections[data.sid]){
            this.$player.find('.fa-heart').addClass('highlight');
          }else{
            this.$player.find('.fa-heart').removeClass('highlight');
          }
    },
    timeFormat:function(time){
            var min = Math.floor(time / 60);
            var sec = Math.floor(time) % 60 + '';
            sec = sec.length === 2 ? sec : '0' + sec;
            var result = min + ":" + sec
            return result;
    },
    upTimeState: function () {
        //时间状态展示
        var totalTime = this.timeFormat(this.audio.duration);
        this.$player.find('.time .totalTime').text(totalTime);
        this.curTime = this.timeFormat(this.audio.currentTime)
        // console.log('curtime'+':'+this.curTime);
        this.$player.find('.time .curTime').text(this.curTime + '/');
        this.$player.find('.progress-load').css('width', this.audio.currentTime / this.audio.duration * 100 + '%')
    },
    loadLyric: function () {
        var _this = this;
        $.getJSON('https://jirenguapi.applinzi.com/fm/getLyric.php', {
                sid: _this.song.sid
            })
            .done(function (ret) {
                console.log(ret.lyric);
                _this.setLyric(ret.lyric);
            })
            .fail(function () {
                console.log('error');
            });
    },
    setLyric: function (lyric) {
        var lyricObj = {};
        lyric.split('\n').forEach(function (line) {
            var times = line.match(/\d{2}:\d{2}/g);
            var str = line.replace(/\[.+\]/g, '');
            //match没有匹配到时，会返回null,所以需要判断times是否为数组
            if (Array.isArray(times)) {
                times.forEach(function (time) {
                    lyricObj[time] = str;
                })
            }
        })
        this.lyricObj = lyricObj;
        // console.log(this.lyricObj);
        //歌词显示
        this.allLyric = Object.values(this.lyricObj);
        this.allTime = Object.keys(this.lyricObj);
        var tpl = '';
        this.allLyric.forEach(function (ly) {
            tpl += '<p>' + ly + '</p>';
        })
        this.$player.find('.lyric .lyric-content').html(tpl);
        this.$player.find('.lyric-content').css('transform', 'translateY(0px)');
    },
    lyricScroll: function () {
        if (this.lyricObj && ('0' + this.curTime) in this.lyricObj) {
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
    loadFromLocal: function () {
        return JSON.parse(localStorage['collections'] || '{}')
    },

    saveToLocal: function () {
        localStorage['collections'] = JSON.stringify(this.collections)
    },

    loadCollection: function () {
        var keyArray = Object.keys(this.collections)
        if (keyArray.length === 0) return
        var randomIndex = Math.floor(Math.random() * keyArray.length)
        var randomSid = keyArray[randomIndex]
        this.setMusic(this.collections[randomSid])
    }

};
Footer.init();
Fm.init();