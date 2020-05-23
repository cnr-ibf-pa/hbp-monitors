# Create your models here.
# -*- coding: utf-8 -*-

from django.db import models
from django.utils.timezone import now


class Access(models.Model):
    user_id = models.IntegerField()
    date = models.DateTimeField(auto_now_add=True)
    application = models.CharField(max_length=3)

    def __str__(self):
        return '<user_id=%s; date=%s; application=%s>' % (self.user_id, self.date, self.application) 

    def save(self, *args, **kargs):
        if self.date is None:
            self.date = now()
        try:
            last_access = list(Access.objects.filter(user_id=self.user_id))[-1]
            if ((self.date - last_access.date).seconds / 300) < 1.0 and self.application == last_access.application:
                print('Sessione already saved')
                return
        except IndexError:
            pass
        print('Saving session...')
        super(Access, self).save(*args, **kargs)
    
    def as_json(self):
        return dict(user_id=self.user_id, date=self.date, application=self.application + '-Monitor')
