-- AddField vehiculeAssigne to Service
ALTER TABLE "Service" ADD COLUMN "vehiculeAssigne" TEXT;
-- vehiculeAssigne stocke le parc (ex: "TC-0001") de l'autobus assigné au service
