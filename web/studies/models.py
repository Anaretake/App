from django.db import models

class Study(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default= 'загружено')
    file_count = models.IntegerField(default=0)
    data_path = models.CharField(max_length=500,blank=True)
    anonymized_patient_name = models.CharField(max_length=100,blank=True)
    accession_number = models.CharField(max_length=100,blank=True)

    def __str__(self):
        return self.anonymized_patient_name or f"Исследованеи №{self.id}"

