
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// New utility imports
import { formatDateTime, toInputDateTime, fromInputDateTimeToISO } from "@/components/utils/dateUtils";

export default function EditarAgendamentoDialog({ aberto, setAberto, servico, onSalvar }) {
  const [dadosAgendamento, setDadosAgendamento] = useState({
    agendado: servico?.agendado || false,
    data_agendamento: servico?.data_agendamento ? toInputDateTime(servico.data_agendamento) : ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Converter data_agendamento de datetime-local para ISO, mantendo horário local do dispositivo
    const dataAgendamentoISO = dadosAgendamento.data_agendamento ? 
      fromInputDateTimeToISO(dadosAgendamento.data_agendamento) : null;
    
    onSalvar({
      agendado: dadosAgendamento.agendado,
      data_agendamento: dataAgendamentoISO
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent className="max-w-md bg-gray-800 border-2 border-green-500/30">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Editar Agendamento
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-2">
            OS #{servico?.numero_pedido}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {servico?.data_agendamento && (
            <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
              <p className="text-xs text-gray-400 mb-1">Agendamento Atual:</p>
              <p className="text-sm font-semibold text-white">
                {formatDateTime(servico.data_agendamento)}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="agendado"
              checked={dadosAgendamento.agendado}
              onCheckedChange={(checked) => setDadosAgendamento({...dadosAgendamento, agendado: checked})}
            />
            <label htmlFor="agendado" className="text-sm font-medium cursor-pointer text-gray-300">
              Serviço agendado
            </label>
          </div>

          {dadosAgendamento.agendado && (
            <div className="space-y-2">
              <Label className="text-gray-300">Nova Data e Hora</Label>
              <Input
                type="datetime-local"
                required
                value={dadosAgendamento.data_agendamento}
                onChange={(e) => setDadosAgendamento({...dadosAgendamento, data_agendamento: e.target.value})}
                className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
              />
              <p className="text-xs text-gray-500">
                ⏰ O horário será salvo conforme o relógio do seu dispositivo
              </p>
            </div>
          )}

          {!dadosAgendamento.agendado && servico?.agendado && (
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <AlertDescription className="text-yellow-400 text-sm">
                O agendamento será removido e o serviço voltará para a lista normal.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button type="button" variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Salvar Agendamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
