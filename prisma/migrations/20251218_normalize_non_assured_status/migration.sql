-- Fix: Normalize 'Non-Assuré' to 'Non assuré' format
UPDATE "Service" SET statut = 'Non assuré' WHERE statut = 'Non-Assuré';
